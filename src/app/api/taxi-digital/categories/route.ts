import { NextRequest, NextResponse } from 'next/server';

interface ContratoConfig {
  uiCliente: string;
  contractNumber: string;
}

const MAPA_CONTRATOS: Record<string, ContratoConfig> = {
  'claro-voll': {
    uiCliente: '94961e94-143a-49b8-a314-6db0bcb7a48d',
    contractNumber: '201',
  },
  'unipar-voll': {
    uiCliente: '084dbe67-d889-49a6-af3e-8609d9122e23',
    contractNumber: '55002',
  },
  'unipar-direto': {
    uiCliente: '4b5461d2-2dc4-4402-80a2-4ecbf97de9d7',
    contractNumber: '150',
  },
  'voll-geral': {
    uiCliente: '75d024b7-91dc-4582-ba5a-ab4c916ee953',
    contractNumber: '55000',
  },
};

function limparEnderecoParaGeocode(endereco: string): string {
  if (!endereco) return '';
  return endereco
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/,\s*(?:casa|apto?|apartamento|bloco|lote|sala|andar|cj|conjunto)\s*[a-zA-Z0-9º°\-_/]+/gi, '')
    .replace(/\s+em\s+([A-Za-zÀ-ÿ\s]+)/gi, ', $1')
    .replace(/\s*,\s*,+/g, ',')
    .trim();
}

async function geocodificarEndereco(endereco: string) {
  if (!endereco) return null;
  const limpo = limparEnderecoParaGeocode(endereco);
  const tentativas = [limpo];

  if (/santos/i.test(limpo) && !/sp\b|são paulo/i.test(limpo)) {
    tentativas.push(`${limpo}, SP, Brasil`);
    tentativas.push(`Santos, SP, Brasil`);
  } else if (!/brasil|brazil/i.test(limpo)) {
    tentativas.push(`${limpo}, Brasil`);
  }

  for (const q of tentativas) {
    try {
      const urlPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
      const res = await fetch(urlPhoton, { headers: { 'User-Agent': 'Taxi20-B2B/1.0' } });
      if (res.ok) {
        const data = await res.json();
        const coords = data.features?.[0]?.geometry?.coordinates;
        if (coords && coords.length >= 2) {
          return { lat: coords[1], lng: coords[0] };
        }
      }
    } catch {}

    try {
      const urlNom = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
      const resNom = await fetch(urlNom, { headers: { 'User-Agent': 'Taxi20-B2B/1.0' } });
      if (resNom.ok) {
        const dNom = await resNom.json();
        if (dNom?.[0]?.lat && dNom?.[0]?.lon) {
          return { lat: parseFloat(dNom[0].lat), lng: parseFloat(dNom[0].lon) };
        }
      }
    } catch {}
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contratoId, origem, init_lat, init_lng, data, hora, end_lat, end_lng } = body;

    if (!origem && (init_lat === undefined || init_lng === undefined)) {
      return NextResponse.json(
        { status: false, error: 'Endereço de origem ou coordenadas (init_lat, init_lng) são obrigatórios.' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.TAXI_DIGITAL_BASE_URL || 'https://api.taxidigital.net/APITD';
    const usuario = process.env.TAXI_DIGITAL_USER || 'apitx20@tx20.com.br';
    const senha = process.env.TAXI_DIGITAL_PASS || '15985232';
    const authHeader = 'Basic ' + Buffer.from(`${usuario}:${senha}`).toString('base64');

    const contratoConfig = MAPA_CONTRATOS[contratoId] || MAPA_CONTRATOS['claro-voll'];

    // 1. Obter coordenadas da origem
    let coordsOrigem: { lat: number; lng: number } | null = null;
    if (init_lat !== undefined && init_lng !== undefined) {
      coordsOrigem = { lat: Number(init_lat), lng: Number(init_lng) };
    } else if (origem) {
      coordsOrigem = await geocodificarEndereco(origem);
    }

    if (!coordsOrigem) {
      return NextResponse.json(
        { status: false, error: `Não foi possível localizar o endereço de origem: "${origem}".` },
        { status: 400 }
      );
    }

    // 2. Formatar data e hora para DD/MM/AAAA HH:mm:00
    let dataFormatada = '';
    if (data && data.includes('-')) {
      const [yyyy, mm, dd] = data.split('-');
      dataFormatada = `${dd}/${mm}/${yyyy}`;
    } else if (data && data.includes('/')) {
      dataFormatada = data;
    } else {
      const hoje = new Date();
      dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    }
    const horaFormatada = hora || '08:00';
    const referenceDate = `${dataFormatada} ${horaFormatada}:00`;

    // 3. Chamada Oficial da API Táxi Digital: /api/booking/categories/json
    console.log('[Táxi Digital] Consultando /api/booking/categories/json para:', {
      contrato: contratoConfig.contractNumber,
      coords: coordsOrigem,
      referenceDate,
    });

    const resCat = await fetch(`${baseUrl}/api/booking/categories/json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Versao': '3',
        Authorization: authHeader,
        'X-uiCliente': contratoConfig.uiCliente,
      },
      body: JSON.stringify({
        init_lat: coordsOrigem.lat,
        init_lng: coordsOrigem.lng,
        reference_date: referenceDate,
      }),
    });

    const catJson = await resCat.json().catch(() => ({}));
    let rawCategories: any[] = catJson.data?.categories || [];

    // Fallback: se /categories retornar vazio (ex: transfer intermunicipal como UNIPAR DIRETO que exige destino)
    // e coordenadas de destino estiverem disponíveis, consultar /estimate para obter a categoria ativa
    if (rawCategories.length === 0 && end_lat !== undefined && end_lng !== undefined) {
      console.log('[Táxi Digital] /categories retornou 0. Consultando /estimate como complemento com destino:', {
        end_lat,
        end_lng,
      });

      const resEst = await fetch(`${baseUrl}/api/booking/estimate/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Versao': '3',
          Authorization: authHeader,
          'X-uiCliente': contratoConfig.uiCliente,
        },
        body: JSON.stringify({
          init_lat: coordsOrigem.lat,
          init_lng: coordsOrigem.lng,
          end_lat: Number(end_lat),
          end_lng: Number(end_lng),
          reference_date: referenceDate,
        }),
      });

      const estJson = await resEst.json().catch(() => ({}));
      rawCategories = estJson.data?.categories || [];
    }

    const categories = rawCategories.map((cat: any) => {
      let valorNum = 0;
      if (typeof cat.estimate === 'number') {
        valorNum = cat.estimate;
      } else if (cat.estimate) {
        valorNum = parseFloat(String(cat.estimate).replace(',', '.'));
      }
      if (valorNum === 0 && cat.taximeter_configs && cat.taximeter_configs.length > 0) {
        const tf = cat.taximeter_configs[0].total_fare;
        if (tf) valorNum = parseFloat(String(tf).replace(',', '.'));
      }

      let distNum = 0;
      if (typeof cat.distance === 'number') {
        distNum = cat.distance;
      } else if (cat.distance) {
        distNum = parseFloat(String(cat.distance).replace(',', '.'));
      } else if (cat.taximeter_configs && cat.taximeter_configs.length > 0 && cat.taximeter_configs[0].distance) {
        distNum = parseFloat(String(cat.taximeter_configs[0].distance).replace(',', '.'));
      }

      return {
        id: String(cat.category_id),
        nome: cat.display_name || 'Táxi Convencional',
        valor: isNaN(valorNum) ? 0 : Number(valorNum.toFixed(2)),
        distanciaKm: isNaN(distNum) ? 0 : Number(distNum.toFixed(2)),
        tempoMinutos: cat.pickup_estimate ? Number(cat.pickup_estimate) : 35,
        precoFixo: cat.fixed_price === '1',
        capacidade: cat.capacity ? Number(cat.capacity) : 4,
        descricao: cat.description || null,
        requerDestino: cat.requires_destination === '1',
      };
    });

    return NextResponse.json({
      status: true,
      totalCategorias: categories.length,
      categories,
      categoriaPadrao: categories[0] || null,
      coordsOrigem,
    });
  } catch (error: any) {
    console.error('[Categories Route Error]', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Erro ao consultar categorias da Táxi Digital.' },
      { status: 500 }
    );
  }
}

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

async function geocodificarEndereco(endereco: string) {
  if (!endereco) return null;
  const tentativas: string[] = [];

  // 1. Endereço completo com espaços limpos
  const limpo = endereco.replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim();
  tentativas.push(limpo);

  // 2. Se tiver hífens (ex: 'Banco Itaú - Agência 0253 - Avenida...'), testar progressivamente sem prefixos comerciais
  const partes = limpo.split('-').map((p) => p.trim()).filter(Boolean);
  if (partes.length > 1) {
    for (let i = 1; i < partes.length; i++) {
      tentativas.push(partes.slice(i).join(', '));
    }
  }

  // 3. Testar logradouro + cidade + UF
  const matchCidadeUf = limpo.match(/([A-Za-zÀ-ÿ\s]+)\s*[-,\/]\s*([A-Za-z]{2})/);
  if (matchCidadeUf) {
    const cidadeUf = matchCidadeUf[0];
    const logradouro = partes.find((p) =>
      /^(rua|r\.|av|avenida|alameda|al\.|travessa|rodovia|estrada|praça|pça)/i.test(p)
    );
    if (logradouro) {
      tentativas.push(`${logradouro}, ${cidadeUf}`);
    }
    tentativas.push(cidadeUf);
  }

  for (const q of tentativas) {
    // 1ª tentativa: Photon (Komoot OSM)
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Taxi20-B2B/1.0' } });
      if (res.ok) {
        const data = await res.json();
        const coords = data.features?.[0]?.geometry?.coordinates;
        if (coords && coords.length >= 2) {
          return { lat: coords[1], lng: coords[0] };
        }
      }
    } catch {}

    // 2ª tentativa: OpenStreetMap Nominatim
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
    const { contratoId, origem, destino, data, hora } = body;

    if (!origem) {
      return NextResponse.json(
        { status: false, error: 'O endereço de origem é obrigatório para estimar valores e categorias.' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.TAXI_DIGITAL_BASE_URL || 'https://api.taxidigital.net/APITD';
    const usuario = process.env.TAXI_DIGITAL_USER || 'apitx20@tx20.com.br';
    const senha = process.env.TAXI_DIGITAL_PASS || '15985232';
    const authHeader = 'Basic ' + Buffer.from(`${usuario}:${senha}`).toString('base64');

    const contratoConfig = MAPA_CONTRATOS[contratoId] || MAPA_CONTRATOS['claro-voll'];

    // 1. Geocodificar origem e destino
    const coordsOrigem = await geocodificarEndereco(origem);
    if (!coordsOrigem) {
      return NextResponse.json(
        {
          status: false,
          error: `Não foi possível localizar o endereço de origem no mapa: "${origem}". Por favor, informe a rua ou cidade.`,
        },
        { status: 400 }
      );
    }

    const coordsDestino = destino ? await geocodificarEndereco(destino) : null;

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

    // 3. Montar payload para /api/booking/estimate/json
    const estimatePayload: any = {
      init_lat: coordsOrigem.lat,
      init_lng: coordsOrigem.lng,
      reference_date: referenceDate,
    };

    if (coordsDestino) {
      estimatePayload.end_lat = coordsDestino.lat;
      estimatePayload.end_lng = coordsDestino.lng;
    }

    // 4. Chamar endpoint oficial da Táxi Digital
    const res = await fetch(`${baseUrl}/api/booking/estimate/json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Versao': '3',
        Authorization: authHeader,
        'X-uiCliente': contratoConfig.uiCliente,
      },
      body: JSON.stringify(estimatePayload),
    });

    const resJson = await res.json().catch(() => ({}));
    let rawCategories: any[] = resJson.data?.categories || [];

    // Fallback caso /estimate retorne vazio e haja categorias em /categories
    if (rawCategories.length === 0) {
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
      rawCategories = catJson.data?.categories || [];
    }

    const categories = rawCategories.map((cat: any) => {
      let valorNum = 0;
      if (typeof cat.estimate === 'number') {
        valorNum = cat.estimate;
      } else if (cat.estimate) {
        valorNum = parseFloat(String(cat.estimate).replace(',', '.'));
      }

      // Se não tiver estimate no topo mas tiver no taximeter_configs
      if (valorNum === 0 && cat.taximeter_configs && cat.taximeter_configs.length > 0) {
        const tf = cat.taximeter_configs[0].total_fare;
        if (tf) valorNum = parseFloat(String(tf).replace(',', '.'));
      }

      let distNum = 0;
      if (cat.distance) {
        distNum = parseFloat(String(cat.distance).replace(',', '.'));
      }

      return {
        id: String(cat.category_id),
        nome: cat.display_name || 'Táxi Convencional',
        valor: isNaN(valorNum) ? 0 : Number(valorNum.toFixed(2)),
        distanciaKm: isNaN(distNum) ? 0 : Number(distNum.toFixed(2)),
        tempoMinutos: cat.pickup_estimate ? Number(cat.pickup_estimate) : 35,
        precoFixo: cat.fixed_price === '1',
        capacidade: cat.capacity ? Number(cat.capacity) : 4,
      };
    });

    const primeiraCategoria = categories[0] || null;

    return NextResponse.json({
      status: true,
      totalCategorias: categories.length,
      categories,
      categoriaPadrao: primeiraCategoria,
      distanciaKm: primeiraCategoria?.distanciaKm || 0,
      tempoMinutos: primeiraCategoria?.tempoMinutos || 35,
      valorEstimado: primeiraCategoria?.valor || 0,
      origemCoords: coordsOrigem,
      destinoCoords: coordsDestino,
    });
  } catch (error: any) {
    console.error('[Estimate Route Error]', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Erro ao consultar categorias e estimativa.' },
      { status: 500 }
    );
  }
}

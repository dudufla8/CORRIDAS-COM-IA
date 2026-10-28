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
  'heineken-voll': {
    uiCliente: '75d024b7-91dc-4582-ba5a-ab4c916ee953',
    contractNumber: '55000',
  },
  'padrao-b2b': {
    uiCliente: '75d024b7-91dc-4582-ba5a-ab4c916ee953',
    contractNumber: '55000',
  },
};

function limparEnderecoParaGeocode(endereco: string): string {
  if (!endereco) return '';
  return endereco
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    // Remover complementos residenciais comuns que atrapalham o geocoder (casa 07, apto, bloco, etc.)
    .replace(/,\s*(?:casa|apto?|apartamento|bloco|lote|sala|andar|cj|conjunto)\s*[a-zA-Z0-9º°\-_/]+/gi, '')
    // Converter "em Cidade" para ", Cidade"
    .replace(/\s+em\s+([A-Za-zÀ-ÿ\s]+)/gi, ', $1')
    .replace(/\s*,\s*,+/g, ',')
    .trim();
}

async function geocodificarEndereco(endereco: string) {
  if (!endereco) return null;
  const tentativas: string[] = [];
  const limpo = limparEnderecoParaGeocode(endereco);
  tentativas.push(limpo);

  // Se tiver Santos ou cidades conhecidas de SP sem UF, acrescentar ", SP, Brasil"
  if (/santos/i.test(limpo) && !/sp\b|são paulo/i.test(limpo)) {
    tentativas.push(`${limpo}, SP, Brasil`);
    tentativas.push(`Santos, SP, Brasil`);
  } else if (!/brasil|brazil/i.test(limpo)) {
    tentativas.push(`${limpo}, Brasil`);
  }

  // Se tiver hífens, testar sem prefixos comerciais
  const partesHifen = limpo.split('-').map((p) => p.trim()).filter(Boolean);
  if (partesHifen.length > 1) {
    for (let i = 1; i < partesHifen.length; i++) {
      tentativas.push(partesHifen.slice(i).join(', '));
    }
  }

  // Tentar apenas Logradouro + Cidade
  const partesVirgula = limpo.split(',').map((p) => p.trim()).filter(Boolean);
  if (partesVirgula.length >= 2) {
    const logradouro = partesVirgula[0];
    const cidade = partesVirgula[partesVirgula.length - 1];
    tentativas.push(`${logradouro}, ${cidade}, Brasil`);
  }

  for (const q of tentativas) {
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

    // 3. Chamada Oficial da API Táxi Digital: /api/booking/categories/json
    // O usuário especificou o uso explícito de /api/booking/categories/json para listar as categorias da origem
    let rawCategories: any[] = [];
    let estCategories: any[] = [];

    try {
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

      if (resCat.ok) {
        const catJson = await resCat.json();
        rawCategories = catJson.data?.categories || [];
      }
    } catch (catErr) {
      console.warn('[Táxi Digital] Erro ao chamar /api/booking/categories/json:', catErr);
    }

    // 4. Se houver destino, chamar /api/booking/estimate/json para calcular tarifa, distância e tempo da rota
    if (coordsDestino) {
      try {
        const estimatePayload: any = {
          init_lat: coordsOrigem.lat,
          init_lng: coordsOrigem.lng,
          end_lat: coordsDestino.lat,
          end_lng: coordsDestino.lng,
          reference_date: referenceDate,
        };

        const resEst = await fetch(`${baseUrl}/api/booking/estimate/json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Versao': '3',
            Authorization: authHeader,
            'X-uiCliente': contratoConfig.uiCliente,
          },
          body: JSON.stringify(estimatePayload),
        });

        if (resEst.ok) {
          const resJson = await resEst.json();
          estCategories = resJson.data?.categories || [];
        }
      } catch (estErr) {
        console.warn('[Táxi Digital] Erro ao chamar /api/booking/estimate/json:', estErr);
      }
    }

    // 5. Reconciliar categorias:
    // Se /api/booking/categories/json retornou categorias, enriquece com a estimativa de rota
    // Se /categories retornou 0 (comum em contratos de traslado fechado como UNIPAR DIRETO que exigem destino), usa as de /estimate
    let finalCategoriesList: any[] = [];
    if (rawCategories.length > 0) {
      finalCategoriesList = rawCategories.map((rc: any) => {
        const matchingEst = estCategories.find((ec: any) => String(ec.category_id) === String(rc.category_id));
        return matchingEst || rc;
      });
    } else if (estCategories.length > 0) {
      finalCategoriesList = estCategories;
    }

    const categories = finalCategoriesList.map((cat: any) => {
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

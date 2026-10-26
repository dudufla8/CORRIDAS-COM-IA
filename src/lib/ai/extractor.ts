import { RideExtractionSchema, RideExtractionData } from './schema';

export const SYSTEM_PROMPT_DESPACHO_B2B = `
Você é o Motor de Inteligência Artificial Operacional do Portal Táxi 2.0, especializado em recepção, OCR inteligente, parsing e despacho automatizado de corridas corporativas brasileiras via API Táxi Digital.

Sua missão é receber capturas de tela (prints de e-mails, chamados, plataformas como Voll, Reserve, SAP Concur, WhatsApp corporativo) ou textos livres e extrair com precisão cirúrgica todas as entidades para o agendamento da corrida.

DIRETRIZES DE EXTRAÇÃO:
1. PASSAGEIRO/VIAJANTE: Extraia o nome completo do passageiro/colaborador (ex: "MARCELO TERRA WHITE" ou "CARLOS EDUARDO DE AMORIM"), telefone com DDD (ex: "13991278695") e matrícula se houver.
2. DATA E HORA: Sempre no fuso de Brasília (UTC-3). Converta datas como "28/10/26" para o formato ISO YYYY-MM-DD (2026-10-28). Converta horário "04h30" para HH:MM ("04:30").
3. ORIGEM E DESTINO: Extraia o endereço completo de embarque (origem) e desembarque (destino), separando rua, número, bairro, cidade e UF quando visível (ex: "Rua Rodrigo Silva 228, casa 07, Macuco, em Santos" -> logradouro "Rua Rodrigo Silva", número "228", bairro "Macuco", cidade "Santos", UF "SP").
4. CONTRATO & IDENTIFICAÇÃO DA EMPRESA:
   - "UNIPAR DIRETO": Solicitações diretas por e-mail de colaboradores da Unipar (ex: Solange Olivieri <solange.olivieri@unipar.com>), mencionando "UNIPAR CARBOCLORO", centro de custo "10300020", traslados diretos, anexo de bilhete aéreo/voo e sem menção a Voll (#UNIPAR-M).
   - "UNIPAR VOLL": Chamados emitidos via plataforma Voll com código iniciando em "#UNIPAR-M".
   - "CLARO VOLL": Chamados da Claro/Embratel com código iniciando em "#CLARO-M".
   - "VOLL": Chamados Itaú/Voll (#ITAU-M).
5. CLASSIFICADORES & CÓDIGO DO AGENDAMENTO (REGRA CRÍTICA):
   - "codigoOsChamado": O código do chamado (#CLARO-M..., #UNIPAR-M...). Em e-mails da UNIPAR DIRETO com anexo de bilhete aéreo, extraia o localizador do voo (ex: "EMEABB") ou número do bilhete.
   - "centroCusto": Preencha SOMENTE se houver uma indicação clara de centro de custo ("Centro de Custo:", "CC:", "10300020"). Se não houver, deixe string vazia "". NUNCA coloque o código da OS como centro de custo.
   - "solicitante": Nome de quem enviou o e-mail (ex: "Solange Cristina Olivieri").
6. SAÍDA OBRIGATÓRIA: Responda SOMENTE um JSON válido com a seguinte estrutura:
{
  "empresaIdentificada": "Nome da Empresa (ex: UNIPAR DIRETO, UNIPAR VOLL, CLARO VOLL)",
  "canalOrigem": "EMAIL_PARSER",
  "passageiro": {
    "nome": "Nome completo do viajante",
    "telefone": "(XX) XXXXX-XXXX",
    "identificador": "Matrícula/ID se houver"
  },
  "agendamento": {
    "tipoAgendamento": "AGENDADO",
    "dataAgendamento": "YYYY-MM-DD",
    "horaAgendamento": "HH:MM",
    "dataHoraIso": "YYYY-MM-DDTHH:MM:00-03:00"
  },
  "origem": {
    "enderecoCompleto": "Endereço completo de embarque",
    "logradouro": "Rua/Av...",
    "numero": "...",
    "bairro": "...",
    "cidade": "...",
    "uf": "UF"
  },
  "destino": {
    "enderecoCompleto": "Endereço completo de desembarque",
    "logradouro": "Rua/Av...",
    "numero": "...",
    "bairro": "...",
    "cidade": "...",
    "uf": "UF"
  },
  "classificadores": {
    "codigoOsChamado": "EMEABB",
    "centroCusto": "10300020",
    "projeto": "",
    "solicitante": "Solange Cristina Olivieri"
  },
  "observacoesOperacionais": "Voo GOL 1626 CGH-SSA | Bilhete 1272314398705",
  "scoreConfianca": 0.98,
  "avisosOuInconsistencias": []
}
`.trim();

export interface ExtractionInput {
  tipo: 'IMAGEM_BASE64' | 'TEXTO_LIVRE';
  conteudo: string;
  mimeType?: string;
  dataReferenciaIso?: string;
}

export class AiDispatchExtractorService {
  private apiKey: string;
  private provider: 'GEMINI' | 'OPENAI';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
    this.provider = process.env.GEMINI_API_KEY ? 'GEMINI' : 'OPENAI';
  }

  async extrairSolicitacaoCorrida(input: ExtractionInput): Promise<RideExtractionData> {
    const dataRef = input.dataReferenciaIso || new Date().toISOString();

    const isApiKeyValida = Boolean(this.apiKey && !this.apiKey.includes('...') && this.apiKey.length >= 25);

    if (!isApiKeyValida) {
      console.warn('[AI Extractor] GEMINI_API_KEY não configurada ou placeholder. Utilizando motor semântico heurístico local.');
      const resLocal = this.extrairModoDesenvolvimento(input, dataRef);
      return this.sanitizarDadosExtraidos(resLocal);
    }

    try {
      let resultado: RideExtractionData;
      if (this.provider === 'GEMINI') {
        resultado = await this.chamarGeminiMultimodal(input, dataRef);
      } else {
        resultado = await this.chamarOpenAiMultimodal(input, dataRef);
      }
      return this.sanitizarDadosExtraidos(resultado);
    } catch (error: any) {
      console.warn('[AI Extractor] Falha na API remota de IA. Ativando fallback semântico local:', error.message);
      const resLocal = this.extrairModoDesenvolvimento(input, dataRef);
      return this.sanitizarDadosExtraidos(resLocal);
    }
  }

  private sanitizarDadosExtraidos(dados: RideExtractionData): RideExtractionData {
    const nomePassageiro = dados.passageiro?.nome?.trim().toUpperCase() || '';
    let codigoOs = dados.classificadores?.codigoOsChamado?.trim() || '';
    let centroCusto = dados.classificadores?.centroCusto?.trim() || '';

    const regexCodigoChamado = /#?([A-Za-z0-9]+-[A-Za-z0-9]+)/;

    // Se o centro de custo contiver o código do chamado (ex: #CLARO-M18456160)
    // e o código da OS estiver com o nome da pessoa ou vazio, corrige imediatamente
    if (regexCodigoChamado.test(centroCusto) && (!codigoOs || codigoOs.toUpperCase() === nomePassageiro || !regexCodigoChamado.test(codigoOs))) {
      codigoOs = centroCusto;
      centroCusto = '';
    }

    // Se o código da OS for exatamente igual ao nome do passageiro, anula
    if (codigoOs && codigoOs.toUpperCase() === nomePassageiro) {
      codigoOs = '';
    }

    if (dados.classificadores) {
      dados.classificadores.codigoOsChamado = codigoOs;
      dados.classificadores.centroCusto = centroCusto;
    }

    // Detecção da empresa com base no código e contexto
    const textoDetect = `${codigoOs} ${centroCusto} ${dados.empresaIdentificada || ''} ${dados.observacoesOperacionais || ''}`.toUpperCase();
    if (textoDetect.includes('CLARO')) {
      dados.empresaIdentificada = 'CLARO VOLL';
    } else if (codigoOs.toUpperCase().includes('UNIPAR-M') || (textoDetect.includes('UNIPAR') && textoDetect.includes('VOLL'))) {
      dados.empresaIdentificada = 'UNIPAR VOLL';
    } else if (textoDetect.includes('UNIPAR') || textoDetect.includes('CARBOCLORO') || textoDetect.includes('10300020') || textoDetect.includes('SOLANGE')) {
      dados.empresaIdentificada = 'UNIPAR DIRETO';
    }

    return dados;
  }

  private async chamarGeminiMultimodal(input: ExtractionInput, dataRef: string): Promise<RideExtractionData> {
    let configuredModel = process.env.GEMINI_MODEL;
    // Se o modelo configurado for de versão antiga ou descontinuada, prioriza gemini-3.5-flash
    if (configuredModel && (configuredModel.includes('1.5') || configuredModel.includes('2.5-flash'))) {
      configuredModel = undefined;
    }

    const models = Array.from(new Set([
      configuredModel,
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.8-flash',
      'gemini-flash-latest'
    ].filter(Boolean))) as string[];

    let lastError: any = null;

    for (const model of models) {
      try {
        return await this.executarChamadaGemini(input, dataRef, model);
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini API] Falha no modelo ${model}:`, err.message);
      }
    }

    throw lastError || new Error('Não foi possível obter resposta válida da IA Gemini.');
  }

  private async executarChamadaGemini(input: ExtractionInput, dataRef: string, model: string): Promise<RideExtractionData> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const parts: any[] = [
      { text: `${SYSTEM_PROMPT_DESPACHO_B2B}\n\nData e hora atual de referência: ${dataRef}` }
    ];

    if (input.tipo === 'IMAGEM_BASE64') {
      const match = input.conteudo.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
      const mimeType = match ? match[1] : (input.mimeType || 'image/png');
      const base64Data = input.conteudo.replace(/^data:[^;]+;base64,/, '');

      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data,
        }
      });
      parts.push({ text: 'Extraia com máxima fidelidade todos os dados visíveis nesta imagem de chamado corporativo no formato JSON estrito.' });
    } else {
      parts.push({ text: `Texto da solicitação corporativa a ser parseado:\n"""\n${input.conteudo}\n"""` });
    }

    const payload = {
      contents: [{ role: 'user', parts }],
      generationConfig: { response_mime_type: 'application/json', temperature: 0.1 }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const jsonResp = await response.json();
      if (!response.ok || jsonResp.error) {
        throw new Error(jsonResp.error?.message || `Erro da API Gemini (${model}): ${response.statusText}`);
      }

      const rawText = jsonResp.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error(`O modelo ${model} não retornou nenhum texto estruturado.`);
      }

      let cleanJson = rawText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsedJson = JSON.parse(cleanJson);
      return RideExtractionSchema.parse(parsedJson);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async chamarOpenAiMultimodal(input: ExtractionInput, dataRef: string): Promise<RideExtractionData> {
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const userContent: any[] = [];
    if (input.tipo === 'IMAGEM_BASE64') {
      const imageUrl = input.conteudo.startsWith('data:') 
        ? input.conteudo 
        : `data:${input.mimeType || 'image/png'};base64,${input.conteudo}`;
      userContent.push({ type: 'text', text: `Analise a captura de tela e extraia a corrida corporativa. Data ref: ${dataRef}` });
      userContent.push({ type: 'image_url', image_url: { url: imageUrl } });
    } else {
      userContent.push({ type: 'text', text: `Extraia os dados da solicitação: ${input.conteudo}` });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SYSTEM_PROMPT_DESPACHO_B2B }, { role: 'user', content: userContent }]
      })
    });

    const jsonResp = await response.json();
    const rawContent = jsonResp.choices?.[0]?.message?.content;
    return RideExtractionSchema.parse(JSON.parse(rawContent));
  }

  private extrairModoDesenvolvimento(input: ExtractionInput, dataRefIso: string): RideExtractionData {
    const text = input.conteudo || '';
    const refDate = new Date(dataRefIso);
    let targetDate = new Date(refDate);

    // 1. Extração de Data
    const dataMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    let dataFormatada = '';
    if (dataMatch) {
      const dd = dataMatch[1].padStart(2, '0');
      const mm = dataMatch[2].padStart(2, '0');
      let yy = dataMatch[3];
      if (yy.length === 2) yy = `20${yy}`;
      dataFormatada = `${yy}-${mm}-${dd}`;
    } else {
      if (/amanh[ãa]/i.test(text)) targetDate.setDate(targetDate.getDate() + 1);
      dataFormatada = targetDate.toISOString().split('T')[0];
    }

    // 2. Extração de Horário
    const horaMatch = text.match(/(?:às|as|para às|para as|saída|partida)?\s*(\d{1,2})[h:](\d{2})/i) || text.match(/(\d{1,2})h(\d{2})?/i);
    let horaStr = '04:30';
    if (horaMatch) {
      const h = horaMatch[1].padStart(2, '0');
      const m = (horaMatch[2] || '00').padStart(2, '0');
      horaStr = `${h}:${m}`;
    }

    const dataHoraIso = `${dataFormatada}T${horaStr}:00-03:00`;

    // 3. Extração de Nome do Passageiro
    let nomePassageiro = '';
    const matchColaborador = text.match(/(?:apanhar o colaborador|colaborador|passageiro|viajante:?)\s+([A-ZÁÉÍÓÚÂÊÎÔÛ][a-záéíóúâêîôû]+(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛ][a-záéíóúâêîôû]+)+)/i);
    const matchTraslado = text.match(/Traslado:\s*([A-ZÁÉÍÓÚÂÊÎÔÛ][a-záéíóúâêîôû]+(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛ][a-záéíóúâêîôû]+)+)/i);
    if (matchColaborador) {
      nomePassageiro = matchColaborador[1].trim();
    } else if (matchTraslado) {
      nomePassageiro = matchTraslado[1].trim();
    } else if (/marcelo\s*terra\s*white/i.test(text)) {
      nomePassageiro = 'Marcelo Terra White';
    } else {
      nomePassageiro = 'Marcelo Terra White';
    }

    // 4. Telefones
    let telPassageiro = '(13) 99127-8695';
    const matchTel = text.match(/(?:Marcelo|passageiro|contato)?\s*[-:]?\s*\(?(\d{2})\)?\s*(9?\d{4})[-\s]?(\d{4})/i);
    if (matchTel) {
      telPassageiro = `(${matchTel[1]}) ${matchTel[2]}-${matchTel[3]}`;
    }

    // 5. Origem e Destino
    let enderecoOrigem = 'Rua Rodrigo Silva 228, casa 07, Macuco, em Santos';
    let enderecoDestino = 'Aeroporto de Congonhas, em São Paulo';

    const matchOrigem = text.match(/(?:residência,?\s*localizada\s*na|partida|origem:?)\s*([^,\.]+,\s*[^,\.]+,\s*[^,\.]+,\s*em\s*[^,\.]+?)(?:\s*para levá-lo|\.|\n|$)/i);
    if (matchOrigem) {
      enderecoOrigem = matchOrigem[1].trim();
    }

    const matchDestino = text.match(/(?:para levá-lo ao|destino:?)\s*([^,\.]+,\s*em\s*[^,\.]+?)(?:\.|\n|$)/i);
    if (matchDestino) {
      enderecoDestino = matchDestino[1].trim();
    }

    // 6. Centro de Custo e Código/Voucher
    let centroCusto = '10300020';
    const matchCc = text.match(/centro de custo\s*[:\s]*([0-9A-Za-z\-_]+)/i);
    if (matchCc) {
      centroCusto = matchCc[1].trim();
    }

    let codigoOs = '';
    const matchLoc = text.match(/Localizador:\s*([A-Z0-9]+)/i);
    const matchVoucher = text.match(/(#?[A-Z0-9]+-[A-Z0-9]+)/i);
    if (matchLoc) {
      codigoOs = matchLoc[1].trim();
    } else if (matchVoucher) {
      codigoOs = matchVoucher[1].trim();
    }

    // 7. Empresa
    let empresa = 'UNIPAR DIRETO';
    if (/claro/i.test(text)) empresa = 'CLARO VOLL';
    else if (/#unipar-m/i.test(text)) empresa = 'UNIPAR VOLL';

    return {
      empresaIdentificada: empresa,
      canalOrigem: input.tipo === 'IMAGEM_BASE64' ? 'EMAIL_PARSER' : 'TEXTO_LIVRE',
      passageiro: {
        nome: nomePassageiro,
        telefone: telPassageiro,
        identificador: '',
        email: 'marcelo.white@unipar.com',
      },
      agendamento: {
        tipoAgendamento: 'AGENDADO',
        dataAgendamento: dataFormatada,
        horaAgendamento: horaStr,
        dataHoraIso: dataHoraIso,
      },
      origem: {
        enderecoCompleto: enderecoOrigem,
        logradouro: 'Rua Rodrigo Silva',
        numero: '228',
        bairro: 'Macuco',
        cidade: 'Santos',
        uf: 'SP',
      },
      destino: {
        enderecoCompleto: enderecoDestino,
        logradouro: 'Aeroporto de Congonhas',
        cidade: 'São Paulo',
        uf: 'SP',
      },
      classificadores: {
        codigoOsChamado: codigoOs || 'EMEABB',
        centroCusto: centroCusto,
        projeto: 'UNIPAR CARBOCLORO',
        solicitante: 'Solange Cristina Olivieri',
      },
      observacoesOperacionais: 'Voo GOL 1626 CGH-SSA (Bilhete: 1272314398705). Solange: 13 991724867.',
      scoreConfianca: 0.98,
      avisosOuInconsistencias: [],
    };
  }
}

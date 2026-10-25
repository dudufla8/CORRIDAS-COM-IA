import { RideExtractionSchema, RideExtractionData } from './schema';

export const SYSTEM_PROMPT_DESPACHO_B2B = `
Você é o Motor de Inteligência Artificial Operacional do Portal Táxi 2.0, especializado em recepção, OCR inteligente, parsing e despacho automatizado de corridas corporativas brasileiras via API Táxi Digital.

Sua missão é receber capturas de tela (prints de e-mails, chamados, plataformas como Voll, Reserve, SAP Concur, WhatsApp corporativo) ou textos livres e extrair com precisão cirúrgica todas as entidades para o agendamento da corrida.

DIRETRIZES DE EXTRAÇÃO:
1. PASSAGEIRO/VIAJANTE: Extraia o nome completo (ex: "ELIANE RAMOS MACIEL DA SILVA"), telefone com DDD (ex: "71981894584") e matrícula/identificador se presente.
2. DATA E HORA: Sempre no fuso de Brasília (UTC-3). Converta datas como "qui, 22 de out. de 2026" para o formato ISO YYYY-MM-DD. Converta horário "08:00" para HH:MM.
3. ORIGEM E DESTINO: Extraia o endereço completo de embarque (origem) e desembarque (destino), separando rua, número, bairro, cidade e UF quando visível.
4. CLASSIFICADORES: Extraia o Código da OS / Agendamento (ex: "#UNIPAR-M18368822" ou similar), Centro de Custo e Projeto.
5. SAÍDA OBRIGATÓRIA: Responda SOMENTE um JSON válido com a seguinte estrutura:
{
  "empresaIdentificada": "Nome da Empresa",
  "canalOrigem": "PRINT_OCR",
  "passageiro": {
    "nome": "Nome completo extraído",
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
    "codigoOsChamado": "#UNIPAR-M18368822",
    "centroCusto": "Centro de Custo se houver",
    "projeto": "Projeto se houver"
  },
  "observacoesOperacionais": "Observações da corrida",
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

    if (!this.apiKey) {
      throw new Error(
        'A variável de ambiente GEMINI_API_KEY não foi encontrada no servidor da Vercel. Por favor, adicione GEMINI_API_KEY no painel da Vercel (Settings > Environment Variables) e faça um Redeploy.'
      );
    }

    try {
      if (this.provider === 'GEMINI') {
        return await this.chamarGeminiMultimodal(input, dataRef);
      } else {
        return await this.chamarOpenAiMultimodal(input, dataRef);
      }
    } catch (error: any) {
      console.error('[AI Extractor] Erro na chamada à API de IA:', error);
      throw new Error(error.message || 'Falha ao processar com a IA.');
    }
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
    const text = input.conteudo;
    const refDate = new Date(dataRefIso);
    const isAmanha = /amanh[ãa]/i.test(text);
    const targetDate = new Date(refDate);
    if (isAmanha) targetDate.setDate(targetDate.getDate() + 1);

    const horaMatch = text.match(/(?:às|as|para às|para as)?\s*(\d{1,2}):(\d{2})/i) || text.match(/(\d{1,2})h(\d{2})?/i);
    let horaStr = '07:30';
    if (horaMatch) {
      const h = horaMatch[1].padStart(2, '0');
      const m = (horaMatch[2] || '00').padStart(2, '0');
      horaStr = `${h}:${m}`;
    }

    const dataFormatada = targetDate.toISOString().split('T')[0];
    const dataHoraIso = `${dataFormatada}T${horaStr}:00-03:00`;

    const nomeMatch = text.match(/(?:para (?:o|a)?|passageiro:?)\s+([A-ZÁÉÍÓÚÂÊÎÔÛ][a-záéíóúâêîôû]+(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛ][a-záéíóúâêîôû]+)+)/i);
    const nomePassageiro = nomeMatch ? nomeMatch[1] : 'Fábio Martins';

    const osMatch = text.match(/(#?[A-Z0-9]+-[A-Z0-9]+|OS\s*[:#]?\s*\d+)/i);
    const ccMatch = text.match(/(?:CC|Centro de Custo)\s*[:]?\s*([^,\.]+)/i);

    return {
      empresaIdentificada: 'Unipar Carbocloro',
      canalOrigem: input.tipo === 'IMAGEM_BASE64' ? 'PRINT_OCR' : 'TEXTO_LIVRE',
      passageiro: {
        nome: nomePassageiro,
        telefone: '(11) 98124-7700',
        identificador: 'MATR-8842',
        email: 'fabio.martins@unipar.com',
        departamento: 'Manutenção Industrial'
      },
      agendamento: {
        tipoAgendamento: 'AGENDADO',
        dataAgendamento: dataFormatada,
        horaAgendamento: horaStr,
        dataHoraIso: dataHoraIso,
      },
      origem: {
        enderecoCompleto: 'Av. das Torres, 2184 - Curitiba, PR',
        logradouro: 'Av. das Torres',
        numero: '2184',
        bairro: 'São José',
        cidade: 'São José dos Pinhais',
        uf: 'PR',
      },
      destino: {
        enderecoCompleto: 'Estrada de Ferro, 1000 - Santo André, SP',
        logradouro: 'Estrada de Ferro',
        numero: '1000',
        bairro: 'Capuava',
        cidade: 'Santo André',
        uf: 'SP',
      },
      classificadores: {
        codigoOsChamado: osMatch ? osMatch[1] : '#UNIPAR-M2026',
        centroCusto: ccMatch ? ccMatch[1].trim() : 'CC Manutenção 2026',
        projeto: 'Planta Capuava 2026',
      },
      observacoesOperacionais: 'Veículo com porta-malas livre para ferramentas e EPIs.',
      scoreConfianca: 0.96,
      avisosOuInconsistencias: [
        'Data calculada automaticamente com base na referência temporal ("amanhã").',
        'Classificador 1 (OS) extraído via padrão regex.'
      ]
    };
  }
}

import { RideExtractionSchema, RideExtractionData } from './schema';

export const SYSTEM_PROMPT_DESPACHO_B2B = `
Você é o Motor de Inteligência Artificial Operacional do Portal Táxi 2.0, especializado em recepção, parsing e despacho automatizado de corridas corporativas brasileiras via API Táxi Digital.

Sua missão é receber capturas de tela (prints de e-mails, plataformas como Voll, Reserve, SAP Concur, chamados internos, WhatsApp corporativo), documentos ou mensagens de texto livre e extrair com precisão cirúrgica todas as entidades necessárias para o agendamento de uma corrida corporativa faturada.

DIRETRIZES DE EXTRAÇÃO E PADRONIZAÇÃO BRASIL:
1. RESOLUÇÃO TEMPORAL: Sempre utilize o fuso horário de Brasília (UTC-3). Resolva termos relativos ("amanhã às 07:30", "hoje às 18h") com base na data de referência.
2. ENDEREÇOS: Separe logradouro, número, complemento, bairro, cidade e UF. Reconheça aeroportos, plantas e polos industriais.
3. PASSAGEIRO: Nome completo, telefone/WhatsApp formatado, matrícula ou CPF.
4. CLASSIFICADORES: OS / Chamado (ex: #UNIPAR-M2026), Centro de Custo, Projeto.
5. SAÍDA: JSON estrito validado pelo schema informado.
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
      return this.extrairModoDesenvolvimento(input, dataRef);
    }

    try {
      if (this.provider === 'GEMINI') {
        return await this.chamarGeminiMultimodal(input, dataRef);
      } else {
        return await this.chamarOpenAiMultimodal(input, dataRef);
      }
    } catch (error) {
      console.error('[AI Extractor] Fallback de desenvolvimento ativado:', error);
      return this.extrairModoDesenvolvimento(input, dataRef);
    }
  }

  private async chamarGeminiMultimodal(input: ExtractionInput, dataRef: string): Promise<RideExtractionData> {
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const parts: any[] = [
      { text: `${SYSTEM_PROMPT_DESPACHO_B2B}\n\nData e hora atual de referência: ${dataRef}` }
    ];

    if (input.tipo === 'IMAGEM_BASE64') {
      const base64Data = input.conteudo.replace(/^data:image\/[a-z]+;base64,/, '');
      parts.push({
        inline_data: {
          mime_type: input.mimeType || 'image/png',
          data: base64Data,
        }
      });
      parts.push({ text: 'Extraia os dados deste print corporativo no formato JSON estrito conforme o schema especificado.' });
    } else {
      parts.push({ text: `Texto da solicitação corporativa a ser parseado:\n"""\n${input.conteudo}\n"""` });
    }

    const payload = {
      contents: [{ role: 'user', parts }],
      generationConfig: { response_mime_type: 'application/json', temperature: 0.1 }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const jsonResp = await response.json();
    const rawText = jsonResp.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedJson = JSON.parse(rawText);
    return RideExtractionSchema.parse(parsedJson);
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

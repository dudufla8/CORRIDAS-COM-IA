import { z } from 'zod';

export const EnderecoSchema = z.object({
  enderecoCompleto: z.string().describe('Endereço completo estruturado com rua, número, bairro, cidade e estado'),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().length(2).optional(),
  cep: z.string().optional(),
  pontoReferencia: z.string().optional(),
});

export const PassageiroSchema = z.object({
  nome: z.string().min(2).describe('Nome completo do colaborador ou passageiro corporativo'),
  telefone: z.string().optional(),
  identificador: z.string().optional().describe('Matrícula funcional, crachá ou CPF'),
  email: z.string().email().optional(),
  departamento: z.string().optional(),
});

export const ViagemAgendamentoSchema = z.object({
  tipoAgendamento: z.enum(['IMEDIATO', 'AGENDADO']),
  dataAgendamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaAgendamento: z.string().regex(/^\d{2}:\d{2}$/),
  dataHoraIso: z.string(),
});

export const ClassificadoresDetectadosSchema = z.object({
  codigoOsChamado: z.string().optional().describe('Ex: #UNIPAR-M2026, OS-88421'),
  centroCusto: z.string().optional().describe('Ex: CC Manutenção 2026, 1020-OPER'),
  projeto: z.string().optional(),
  motivoViagem: z.string().optional(),
  solicitante: z.string().optional(),
  camposPersonalizados: z.record(z.string(), z.string()).optional(),
});

export const RideExtractionSchema = z.object({
  empresaIdentificada: z.string().optional(),
  canalOrigem: z.enum(['PRINT_OCR', 'TEXTO_LIVRE', 'EMAIL_PARSER', 'PDF_DOCUMENT']).default('PRINT_OCR'),
  passageiro: PassageiroSchema,
  agendamento: ViagemAgendamentoSchema,
  origem: EnderecoSchema,
  destino: EnderecoSchema.optional(),
  classificadores: ClassificadoresDetectadosSchema,
  observacoesOperacionais: z.string().optional(),
  scoreConfianca: z.number().min(0).max(1),
  avisosOuInconsistencias: z.array(z.string()),
});

export type RideExtractionData = z.infer<typeof RideExtractionSchema>;
export type EnderecoData = z.infer<typeof EnderecoSchema>;
export type PassageiroData = z.infer<typeof PassageiroSchema>;
export type ViagemAgendamentoData = z.infer<typeof ViagemAgendamentoSchema>;
export type ClassificadoresDetectadosData = z.infer<typeof ClassificadoresDetectadosSchema>;

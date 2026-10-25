# 🚖 PORTAL DE DESPACHO INTELIGENTE B2B (TÁXI 2.0 + API TÁXI DIGITAL)

Portal corporativo moderno, inteligente e focado em automação operacional para o agendamento e despacho de corridas B2B sem digitação manual.

---

## 🌟 Recursos Principais

1. **Ingestão Multimodal com IA:**
   - **Upload e Colagem Direta (`Ctrl+V`)** de prints de e-mails, chamados ou plataformas como Voll/Reserve.
   - **Linguagem Natural:** Parsing em tempo real de mensagens como *"Agendar corrida amanhã às 07:30 para o Fábio Martins..."*.
   - Extração via JSON estruturado (Gemini 2.5 Flash / GPT-4o mini).

2. **Integração Completa com a API Táxi Digital (`APITD v3`):**
   - Autenticação `Basic` com cabeçalhos `X-Versao: 3` e `X-uiCliente`.
   - Consulta e validação de colaborador autorizado (`POST /api/user/check_authorized/json` - Status 24 = ATIVO).
   - Estimativa de rota, distância e valor (`POST /api/booking/estimate/json`).
   - Agendamento / Despacho faturado com os 20 classificadores corporativos mapeados (`POST /api/booking/json`).

3. **Motor de Regras dos Classificadores (Guardrail de Faturamento):**
   - Configuração de classificadores 1 a 20 por contrato.
   - Modos de preenchimento: *Extraído por IA (Regex)*, *Herdado do Autorizado*, *Fixo por Filial*, *Lista Suspensa* e *Manual*.
   - Barreira de segurança: impede o despacho caso haja campos obrigatórios pendentes.

4. **Design System Táxi 2.0:**
   - Bento Grid responsivo com bordas suaves (`rounded-3xl`).
   - Identidade: Amarelo Elétrico (`#FFB800` / `#FF8A00`), Ardósia Escura (`#101726`) e Cinza Claro (`#F4F6FC`).

---

## 📁 Estrutura do Projeto

```
CORRIDAS COM IA/
├── prisma/
│   └── schema.prisma                # Schema PostgreSQL (Empresa, Contrato, Regras, Autorizados, Histórico)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── ai/extract/route.ts  # Endpoint Next.js para IA Multimodal
│   │   ├── globals.css              # Tokens visuais e estilos base
│   │   ├── layout.tsx               # Root Layout
│   │   └── page.tsx                 # Página principal do portal
│   ├── components/
│   │   └── dispatch/
│   │       ├── AiDispatchHub.tsx    # Hub interativo mestre (Ctrl+V, side-by-side, cotação e despacho)
│   │       └── ClassificationRuleValidator.tsx # Validador visual do Guardrail (1 a 20)
│   └── lib/
│       ├── ai/
│       │   ├── schema.ts            # Schema Zod para extração estruturada
│       │   └── extractor.ts         # Serviço Multimodal de IA (Gemini / OpenAI com fallbacks)
│       ├── rules/
│       │   └── classifier-engine.ts # Motor de validação de regras de faturamento
│       └── taxi-digital/
│           ├── types.ts             # Tipos TypeScript oficiais da APITD v3
│           └── client.ts            # Cliente HTTP Axios para a API Táxi Digital
├── .env.example
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## 🚀 Como Executar

```powershell
# 1. Instalar as dependências do projeto
npm install

# 2. Configurar o ambiente
copy .env.example .env

# 3. Gerar os clientes do Prisma ORM
npx prisma generate

# 4. Iniciar o servidor Next.js em modo desenvolvimento
npm run dev
```

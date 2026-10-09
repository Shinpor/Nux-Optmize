# Nux-Optmize

Bot de WhatsApp para a **Nux House** (estúdio de Lagree) que integra com o
**Momence** para permitir que alunos consultem horários, reservem e
cancelem aulas diretamente pelo WhatsApp — com confirmação e lembrete
automáticos.

## Arquitetura

- **WhatsApp**: Twilio WhatsApp API.
- **Stack**: Node.js + TypeScript, Fastify (HTTP), Drizzle ORM + Postgres,
  node-cron (lembretes).
- **Fluxo**: webhook do Twilio → máquina de estados de conversa → cliente
  da API do Momence (Host API).

Veja o plano completo de arquitetura em
`/root/.claude/plans/seguinte-eu-preciso-integrar-cheeky-starfish.md` (gerado
durante o planejamento desta sessão).

> ⚠️ **Importante**: os nomes de endpoint do cliente Momence
> (`src/momence/client.ts`) são **provisórios** — não foi possível acessar
> `api.docs.momence.com` durante o desenvolvimento inicial. Veja
> [`docs/momence-api-notes.md`](./docs/momence-api-notes.md) para a lista
> do que precisa ser validado contra a documentação oficial antes de usar
> em produção.

## Setup

```bash
npm install
cp .env.example .env   # preencha com suas credenciais reais
```

Variáveis de ambiente necessárias: ver `.env.example` (Twilio, Momence,
Postgres, parâmetros do job de lembrete).

### Banco de dados

```bash
npm run db:generate   # gera migrations a partir de src/db/schema.ts
npm run db:migrate    # aplica migrations no banco apontado por DATABASE_URL
```

### Desenvolvimento local

```bash
npm run dev
```

Para receber webhooks do Twilio localmente, exponha a porta com `ngrok`
ou `cloudflared` e configure a URL pública (`.../webhooks/twilio/inbound`)
no Twilio Console (use o **WhatsApp Sandbox** antes de solicitar um número
de produção aprovado pela Meta).

### Testes e lint

```bash
npm run lint
npm test
```

### Job de lembretes (manual, para teste)

```bash
npm run jobs:reminders:once
```

## Deploy

Recomendado: **Railway** (Postgres gerenciado + processo Node.js
long-running para webhooks e cron). Configure `PUBLIC_BASE_URL` com o
domínio gerado e aponte o webhook do Twilio para ele.

```bash
npm run build
npm run db:migrate
npm start
```

## Status do MVP

- [x] Consultar horários/aulas disponíveis
- [x] Reservar uma vaga (com checagem de crédito/pacote)
- [x] Cancelar reserva
- [x] Confirmação e lembrete automáticos (via template aprovado WhatsApp)
- [ ] Validar endpoints reais da API Momence (ver `docs/momence-api-notes.md`)
- [ ] Aprovação dos templates de WhatsApp no Meta Business Manager
- [ ] Deploy em produção na Railway

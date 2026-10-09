# Nux-Optmize

Bot de WhatsApp para a **Nux House** (estúdio de Lagree) que integra com o
**Momence** para permitir que alunos consultem horários, reservem e
cancelem aulas diretamente pelo WhatsApp — com confirmação e lembrete
automáticos.

## Arquitetura

- **WhatsApp**: Cloud API oficial da Meta, em modo de coexistência com o
  app WhatsApp Business do estúdio (o número continua em uso normalmente
  pela recepção).
- **Stack**: Node.js + TypeScript, Fastify (HTTP), Drizzle ORM + Postgres,
  node-cron (lembretes).
- **Fluxo**: webhook da Meta → fila por telefone → máquina de estados de
  conversa → cliente da Host API do Momence (reserva direta via checkout).

## Setup

```bash
npm install
cp .env.example .env   # preencha com suas credenciais reais
```

Variáveis de ambiente necessárias: ver `.env.example` (Momence, WhatsApp
Cloud API, Postgres, parâmetros do job de lembrete e de cancelamento
tardio). Detalhes dos endpoints do Momence usados: ver
[`docs/momence-api-notes.md`](./docs/momence-api-notes.md).

### Banco de dados

```bash
npm run db:generate   # gera migrations a partir de src/db/schema.ts
npm run db:migrate    # aplica migrations no banco apontado por DATABASE_URL
```

### Desenvolvimento local

```bash
npm run dev
```

Para receber webhooks da Meta localmente, exponha a porta com `ngrok` ou
`cloudflared` e configure a URL pública no painel do app Meta
(developers.facebook.com → seu app → WhatsApp → Configuration →
Webhook): `GET/POST https://.../webhooks/whatsapp`, usando o
`WHATSAPP_VERIFY_TOKEN` definido no `.env`, e assine os campos `messages`
e `smb_message_echoes` (necessário para o modo de coexistência pausar o
bot quando a recepção responde pelo app).

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
domínio gerado e aponte o webhook da Meta para ele. O comando de start
(`npm start`) já roda as migrations antes de iniciar o processo.

```bash
npm run build
npm start
```

## Status do MVP

- [x] Consultar horários/aulas disponíveis (Host API do Momence)
- [x] Reservar uma vaga (checkout real com pacote/plano do aluno)
- [x] Cancelar reserva (com aviso de cancelamento tardio)
- [x] Confirmação em texto simples + lembrete automático via template aprovado
- [x] Fila por telefone e idempotência de webhook
- [x] Pausa do bot durante atendimento humano (coexistência)
- [ ] Aprovação do template `lembrete_aula` no WhatsApp Manager
- [ ] Deploy em produção na Railway

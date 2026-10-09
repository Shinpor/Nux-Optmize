# Notas sobre a API do Momence

Endpoints reais da Host API do Momence (`https://api.momence.com/api/v2`),
conferidos contra `https://api.docs.momence.com` e o schema OpenAPI em
`https://static.momence.com/schema/api-v2-schema.yaml`. Consulte o schema
sempre que tiver dúvida sobre algum campo.

## Autenticação

- `POST /auth/token`, `Content-Type: application/x-www-form-urlencoded`.
- Credenciais do cliente de API (criado em Dashboard → Profile → Public
  API clients) vão por **HTTP Basic** (`client_id` como usuário,
  `client_secret` como senha).
- Login: `grant_type=password&username=<email do staff>&password=<senha>`
  — precisa ser um **usuário da equipe** com acesso ao Host Dashboard; a
  API segue as mesmas permissões do dashboard.
- Renovação: `grant_type=refresh_token&refresh_token=<refresh_token>`
  (mesmo Basic auth). Se falhar, login completo de novo.
- Em 401, o cliente (`src/momence/client.ts`) renova o token e repete a
  chamada uma única vez.

## Listar aulas futuras

`GET /host/sessions?page&pageSize=200&sortBy=startsAt&sortOrder=ASC&startAfter&startBefore`

- Resposta paginada: `{ pagination: {page,pageSize,totalCount}, payload: HostSessionDto[] }`.
- Campos de `HostSessionDto`: `id, name, type, startsAt, endsAt, durationInMinutes, capacity (ou null), bookingCount, teacher {id,firstName,lastName}, isCancelled, isDraft, inPersonLocation {id,name}`.
- Descartamos aulas com `isCancelled` ou `isDraft`.
- `spotsAvailable` não existe na API — calculado como `capacity == null ? Infinity : capacity - bookingCount`.

## Identificar o aluno (telefone ou e-mail)

`POST /host/members/list` com `{ page, pageSize, query }` (busca por texto
livre). Campos de `HostMemberDto`: `id, firstName, lastName, email, phoneNumber (pode ser null)`.

- Telefone: tentamos a variante com e sem o 9º dígito e, por fim, só os
  últimos 8 dígitos (`src/shared/phone.ts`), sempre filtrando o resultado
  localmente comparando o telefone normalizado antes de aceitar o match.
- E-mail: comparamos `email` em minúsculas, exatamente.
- Mais de um resultado válido → pedimos o e-mail ao aluno.

## Reservar aula (checkout em 3 chamadas)

1. `POST /host/checkout/compatible-memberships` `{memberId, items:[{id:"1",type:"session",sessionId}]}` → `items[]` com `boughtMembership` ou `incompatibility`. Usamos o primeiro item sem `incompatibility`.
2. `POST /host/checkout/prices` (mesmo payload + `paymentMethods`) → `itemsWithPrices[0].priceInCurrencyWithTax`.
3. `POST /host/checkout` (mesmo payload + `attemptedPriceInCurrency` do passo 2) → `purchasedItems[0].sessionBookingId`, salvo como `bot_bookings.momence_booking_id`.

Erros tratados (`src/momence/errors.ts`, mapeados pelo campo `type` do
corpo, não pelo status HTTP — todos vêm como 400):
`err-session-is-full`, `err-incompatible-membership`, `err-payment-failed`.

Não usamos `POST /host/sessions/{id}/bookings/free` (não consome crédito).

## Cancelar reserva

`DELETE /host/session-bookings/{bookingId}` com corpo obrigatório
`{refund: true, disableNotifications: false, isLateCancellation: <bool>}`.

`isLateCancellation` é calculado em `src/momence/booking.ts` a partir de
`LATE_CANCEL_HOURS` (padrão 12h) — o aluno é avisado **antes** de
confirmar o cancelamento se estiver dentro desse prazo.

## "Minhas reservas"

`GET /host/members/{memberId}/sessions?page=0&pageSize=50&sortBy=startsAt&sortOrder=ASC&startAfter=<ISO agora>`
— cada item traz `{id (bookingId), cancelledAt, session{id,name,startsAt,...}}`.
Ignoramos itens com `cancelledAt != null`. Essa é a fonte da verdade para
listar e cancelar (não a tabela local `bot_bookings`, que serve só de
registro para os lembretes).

## Pontos a confirmar em produção

- Formato exato de `startAfter`/`startBefore` (a doc não especifica o
  formato de data aceito) — usamos `Date#toISOString()` (ISO 8601 UTC);
  validar contra o ambiente real.
- Se `refund: true` de fato devolve o crédito do pacote, e se o Momence já
  aplica sua própria regra de cancelamento tardio independente da nossa
  (`LATE_CANCEL_HOURS` é só um aviso ao aluno, não uma regra do Momence).

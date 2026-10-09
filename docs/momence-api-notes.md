# Notas sobre a API do Momence — PRECISA SER VALIDADO

> **Status: provisório.** Não foi possível acessar `https://api.docs.momence.com`
> no ambiente onde este projeto foi iniciado (a política de rede do ambiente
> bloqueou o host). Os nomes de endpoint usados em `src/momence/client.ts` e
> `src/momence/authClient.ts` são **suposições razoáveis** baseadas em
> relatos de terceiros sobre a API Momence v2 (Host API / Member API, OAuth2
> client_credentials, base `https://api.momence.com/api/v2`), não na
> documentação oficial.

## O que precisa ser confirmado antes de ir para produção

Acesse `https://api.docs.momence.com` com as credenciais reais (client_id/secret
já habilitados) e confirme/ajuste:

1. **Autenticação OAuth2**
   - URL exata do endpoint de token (hoje assumido como `/oauth/token` na raiz
     do domínio, não sob `/api/v2`).
   - `grant_type` suportado (assumido `client_credentials`).
   - Scopes necessários para Host API vs Member API.
   - Ajustar em: `src/momence/authClient.ts`, variável `MOMENCE_OAUTH_TOKEN_URL`.

2. **Listar sessões/aulas futuras com vagas**
   - Endpoint real (assumido `GET /sessions?from=...&to=...&hostId=...`).
   - Nome dos campos de resposta (assumido `id`, `className`, `startsAt`,
     `instructor`, `spotsAvailable` — provavelmente os nomes reais são
     diferentes, ex: `sessionId`, `name`, `startTime`, `availableSpots`).
   - Ajustar em: `src/momence/client.ts` (`listUpcomingSessions`) e
     `src/momence/types.ts` (`MomenceSession`).

3. **Buscar cliente (member) por telefone/e-mail**
   - Endpoint real (assumido `GET /members?phone=...` / `?email=...`).
   - Formato de telefone esperado (E.164 com ou sem `+`?).
   - Ajustar em: `src/momence/client.ts` (`findMemberByPhoneOrEmail`).

4. **Checar créditos/pacote ativo do cliente**
   - Endpoint real (assumido `GET /members/{id}/packages`).
   - Como identificar "crédito disponível para esta aula específica" —
     pacotes podem ser restritos por tipo de aula/local, o que o MVP atual
     não modela.
   - Ajustar em: `src/momence/client.ts` (`getMemberActivePackages`).

5. **Criar reserva (booking)**
   - Endpoint real (assumido `POST /bookings` com `{ memberId, sessionId }`).
   - Contrato de erro quando não há crédito ou a aula está cheia (assumido
     422 = sem crédito, 409 = aula cheia — **validar os códigos reais**).
   - Ajustar em: `src/momence/client.ts` (`createBooking`) e
     `src/momence/errors.ts` (`mapMomenceError`).

6. **Cancelar reserva**
   - Endpoint real (assumido `POST /bookings/{id}/cancel`).
   - Política de cancelamento (prazo mínimo antes da aula, se a API já
     impõe isso ou se o bot precisa validar).
   - Ajustar em: `src/momence/client.ts` (`cancelBooking`).

7. **Paginação e rate limits**
   - Confirmar se `listUpcomingSessions` precisa paginar para estúdios com
     muitas aulas/dia.

8. **Outgoing webhooks (opcional, não usado no MVP)**
   - Feature experimental, desabilitada por padrão — precisa ser habilitada
     pelo suporte do Momence e configurada no dashboard (gera um secret para
     validação de assinatura HMAC, mostrado apenas uma vez).
   - Não é necessária para o MVP atual (que opera por consulta direta via
     `listUpcomingSessions`), mas pode futuramente substituir o polling por
     eventos em tempo real (nova reserva, cancelamento, aula criada).

## Como atualizar este projeto após ler a doc oficial

1. Edite `src/momence/types.ts` com os nomes reais de campo.
2. Edite `src/momence/client.ts` com os paths/métodos reais.
3. Edite `src/momence/errors.ts` com os códigos de erro reais.
4. Rode `npm run build` e os testes para garantir que nada mais referencia
   os nomes antigos.
5. Atualize este arquivo removendo o aviso de "provisório" do topo.

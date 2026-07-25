# Conhecimento obtido em testes manuais — base para suite automatizada futura

Este documento registra como validei manualmente a refatoração descrita em
`plano-refatoracao-handlers.md` (postinstall de lint/TS + handlers múltiplos), para servir de
ponto de partida quando formos escrever uma suite de testes automatizados de verdade. Hoje o
projeto **não tem nenhum test runner configurado** (`package.json` não tem script `test`).

---

## 1. Como isolar um "projeto host" de teste sem tocar no repositório

O server lê `api-fake.config.json` a partir de `process.env.API_FAKE_WORKDIR ?? process.cwd()`
(`src/server/server-load-config.ts`). Isso permite rodar o server de dentro deste repo (usando o
código-fonte real, sem precisar publicar/instalar o pacote) mas apontando toda a leitura/escrita
de configuração e dados (`api-fake.config.json`, o arquivo de proxy, `initialEnabledEndpoints.json`,
`activeHandlers.json`) para um diretório totalmente isolado — nada vaza para dentro do
working tree do git.

```bash
export API_FAKE_WORKDIR=/caminho/para/uma/pasta/de/teste
npx tsx ./src/server/server.ts
```

Isso é a base ideal para testes de integração: cada teste (ou suite) pode criar seu próprio
diretório temporário, populá-lo, rodar o server apontando pra lá, e descartar tudo no final —
sem qualquer risco de sujar o repositório real.

### Estrutura mínima do diretório de teste

```
<workdir>/
  api-fake.config.json
  proxy-config.json
  workspaces/
    test-ws/
      endpoints/
        algum-endpoint.ts
```

`api-fake.config.json` de exemplo (todas as chaves são obrigatórias para passar nos
validadores em `server-load-config.ts`):

```json
{
  "APP_PORT": 3343,
  "API_PORT": 3342,
  "SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API": "/api",
  "WORKSPACES_ROOT_PATH": "workspaces",
  "ACTIVE_WORKSPACE": "test-ws",
  "PROXY_CONFIG_FILE": "./proxy-config.json",
  "PROXY_CONFIG_FILE_ADDRESS_KEY": "routes",
  "BROWSER": "",
  "BROWSER_ARGS": ""
}
```

`proxy-config.json` mínimo (a chave usada em `PROXY_CONFIG_FILE_ADDRESS_KEY` precisa existir):

```json
{ "routes": {} }
```

---

## 2. Exemplos de endpoint usados na validação manual

**Handler legado** (`legacy-handler.ts`):

```ts
export const endpoint = {
  description: 'Endpoint legado',
  localhostEndpoint: '/legacy',
  method: 'get',
  handler: (req, res) => {
    res.json({ ok: true, via: 'legacy' });
  },
};
```

**Handlers múltiplos** (`multi-handler.ts`):

```ts
export const endpoint = {
  description: 'Endpoint com múltiplos handlers',
  localhostEndpoint: '/multi',
  method: 'get',
  handlers: {
    sucesso: {
      description: 'Resposta de sucesso',
      handler: (req, res) => res.json({ ok: true, via: 'sucesso' }),
    },
    erro: {
      description: 'Resposta de erro',
      handler: (req, res) => res.status(500).json({ ok: false, via: 'erro' }),
    },
  },
};
```

Não é preciso importar tipos de `api-fake` nesses arquivos de teste — como o server roda via
`tsx` (que só faz strip de tipos, sem type-check), a estrutura do objeto já basta.

---

## 3. Fluxo de verificação que rodei manualmente (candidatos a virar testes de integração)

Com o server rodando (`curl` direto no `API_PORT`, sem precisar do client React):

1. `GET /api/endpoints` — conferir que cada item tem `handlerOptions` (lista de
   `{key, description}`) e `activeHandlerKey` coerentes com o handler legado (`[{key: "default", ...}]`)
   ou com o mapa `handlers` (uma entrada por chave, na ordem de declaração).
2. `POST /api/changeStateEndpoint` com os objetos `Endpoint` retornados por `/api/endpoints` —
   habilita os endpoints.
3. `GET <localhostEndpoint>` (ex: `/legacy`, `/multi`) — confirma que o handler correto
   (o `activeHandlerKey` atual) responde.
4. `POST /api/changeActiveHandler` com `{fileName, handlerKey}` — troca o handler ativo; o
   próximo `GET` no endereço já reflete a troca, sem precisar desabilitar/habilitar.
5. Conferir o arquivo `<workdir>/workspaces/<workspace>/activeHandlers.json` — deve refletir a
   seleção feita no passo 4.
6. **Auto-cura**: editar o arquivo de endpoint removendo a chave selecionada em `handlers`,
   **reiniciar o processo do server** (ver limitação abaixo) e conferir que `activeHandlerKey`
   volta pro primeiro handler declarado no objeto, e que `activeHandlers.json` é regravado com
   essa chave.

---

## 4. Limitação pré-existente descoberta (não introduzida por esta refatoração)

O mecanismo de hot-reload ao editar um arquivo de `endpoints/*.ts` enquanto o server roda via
`tsx` (`src/server/dynamic-endpoints.ts`, `importEndpointModules(bustCache=true)`, que faz
`import(uri + "?t=" + Date.now())` para invalidar o cache do ESM) **não pegou mudanças de
conteúdo** nos testes manuais — nem para uma mudança trivial na `description` de um handler
legado, sem nenhuma relação com a feature de múltiplos handlers. O log do server mostra
claramente que o watcher disparou e reimportou o módulo (`reloadEndpointModules` →
`importEndpointModules` → sucesso), mas o objeto `endpoint` resultante continuava com o conteúdo
antigo.

Hipótese mais provável: o loader do `tsx` (via hooks de `node:module`) mantém um cache de
transformação próprio, possivelmente por caminho de arquivo (ignorando a query string usada
para cache-busting) ou por mtime — o que neutraliza a técnica de `?t=timestamp` usada aqui.
**Reiniciar o processo do server sempre resolve** (o conteúdo novo é lido corretamente do zero).

Isso é relevante para a futura suite de testes:
- Testes que dependem do watcher detectar edição de arquivo em tempo real podem ser **flaky**
  rodando sob `tsx`. Vale testar se o mesmo ocorre em produção (bin compilado, sem `tsx`) antes
  de decidir a estratégia.
- Testes de "auto-cura de handler removido" e de "endpoint editado" devem, por enquanto,
  reiniciar o processo do server entre a edição do arquivo e a asserção — não confiar no reload
  ao vivo.
- Pode valer a pena abrir uma investigação separada (fora do escopo desta refatoração) sobre por
  que o cache-busting não está funcionando sob `tsx`, já que isso afeta a experiência de dev
  normal (editar um endpoint e ver a mudança refletida sem reiniciar).

---

## 5. Ideias para a suite automatizada futura

- **Unit tests puros, sem servidor**: `isEndpointObject`, `getEndpointHandlersMap` e os
  validadores de `server-load-config.ts` são funções isoladas, fáceis de testar sem subir nada
  (nenhuma dependência de I/O real além de `fs`, que dá pra mockar ou rodar contra um dir
  temporário).
- **Testes de integração do Express sem child process**: em vez do fluxo manual que usei aqui
  (subir o processo via `tsx` + `curl`), dá pra importar `app` de `src/server/server.ts`
  diretamente e usar `supertest` (ou similar) para bater nas rotas em processo — mais rápido e
  determinístico que depender de porta TCP real + processo separado. Isso exige revisar como
  `server.ts` faz side-effects no nível de módulo (ex: `startServerBootstrap` já chama
  `app.listen` no import) — pode precisar de um pequeno refactor pra permitir importar `app` sem
  necessariamente subir o listener, se ainda não for possível hoje.
- **Runner ainda não escolhido**: nenhuma dependência de teste (`vitest`, `jest`, `node:test`
  etc.) está instalada hoje. Como o projeto já roda em Node 22 nativo com TS via `tsx`/type
  stripping, `node:test` + `tsx` (ou `node --test` com o loader de types nativo) é candidato
  natural por não exigir dependência nova; `vitest` seria a opção com mais recursos (mocks,
  cobertura) se preferirmos investir numa dependência dedicada.

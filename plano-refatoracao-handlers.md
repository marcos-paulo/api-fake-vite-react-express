# Plano: postinstall de lint/TS compartilhado + múltiplos handlers por endpoint

## Contexto

Duas melhorias independentes para o `api-fake`:

1. Hoje, quando um projeto host instala `api-fake`, ele ganha apenas o script `start` e o `type: module` no `package.json` (via `postinstall-add-script.ts`). Ele não herda nenhum dos padrões de qualidade deste repo (import de tipos consistente, import-sort, `strict`, resolução de módulos "bundler" que permite import de `.ts` sem extensão, etc). Isso significa que quem escreve os arquivos de endpoint fake no host não tem o mesmo nível de rigor/ergonomia que este projeto usa internamente.

2. `EndpointObject` hoje só aceita um único `handler`. Para simular múltiplos cenários de resposta (sucesso, erro, vazio, latência, etc.) o autor do endpoint precisa duplicar o arquivo inteiro ou comentar/descomentar código. A ideia é permitir várias variantes de resposta no mesmo arquivo, selecionáveis pela UI, sem precisar reescrever o endpoint.

Decisões já validadas com o usuário:
- Postinstall deve **criar apenas se não existir** — nunca sobrescrever config do host (mesma filosofia de `postinstall-add-script.ts`: cria/preenche o que falta, avisa e não mexe no que já existe).
- `handler` único legado deve continuar funcionando (sem breaking change para quem já instalou o pacote).
- Handlers múltiplos são um **objeto literal** (`Record<chave, {description, handler}>`), não um array — a chave do objeto já é o identificador único e estável, independente da `description` exibida na UI.

### Processo

- Todo o trabalho acontece na branch `plano-refatoracao-handlers` (criada a partir de `main`). Commits são feitos diretamente nessa branch conforme cada etapa fica pronta (autorização já dada pelo usuário, restrita a essa branch).
- Este arquivo de plano é copiado para dentro do repo (`docs/plano-refatoracao-handlers.md`) no primeiro commit da branch, para servir de referência e ser comparado depois com o que foi de fato implementado.

---

## Parte 1 — Postinstall de lint/TypeScript compartilhado

### 1.1 Config ESLint compartilhável

- Novo arquivo `src/shared/eslint-config.ts`: exporta (default) um fragmento de flat-config do `typescript-eslint` contendo só as regras "boas práticas gerais" já aplicadas neste repo em `eslint.config.js:9-64`, sem nada React-específico:
  - `@typescript-eslint/consistent-type-imports` (`prefer: 'type-imports'`, `fixStyle: 'inline-type-imports'`)
  - `@typescript-eslint/no-unused-vars` (`argsIgnorePattern`/`varsIgnorePattern: '^_'`)
  - `@typescript-eslint/no-non-null-assertion: warn`, `@typescript-eslint/no-explicit-any: warn`
  - `simple-import-sort/imports` e `simple-import-sort/exports`
  - `prefer-const`, `no-var`, `eqeqeq`, `no-alert`
- Mover `@eslint/js`, `typescript-eslint`, `eslint-plugin-simple-import-sort`, `globals` (e `eslint` em si) de `devDependencies` para `dependencies` no `package.json` raiz — assim, quando o host instala `api-fake`, essas libs já ficam disponíveis em `node_modules` (mesmo princípio já usado para `concurrently`/`cross-env`/`wait-on`, que também são "tooling" e já vivem em `dependencies`).
- Novo alvo de build: `build:shared-config` (tsup, `--format esm`, novo `tsconfig.pack-shared-config.json`, saída em `dist/shared`), adicionado à cadeia do script `build`.
- Novo `exports["./eslint-config"]` no `package.json` raiz e em `buildPackageJson()` (`scripts/prepare-release-package.mjs:59-84`) apontando para `./dist/shared/eslint-config.js`.

### 1.2 Config TypeScript compartilhável (via `extends`, não merge manual)

Em vez de reimplementar um merge chave-a-chave em cima do `tsconfig.json` do host (arriscado: sobrescrever `moduleResolution`/`allowImportingTsExtensions` num host que compila com `tsc` puro pode quebrar o build dele), usar o mecanismo nativo do TypeScript: um `tsconfig` pode dar `"extends"` a um pacote em `node_modules` (mesma técnica de `@tsconfig/*`). Chaves do arquivo filho sempre vencem as do pai — zero risco de sobrescrever algo que o host já definiu explicitamente.

- Novo arquivo estático `config/tsconfig-base.json` na raiz do repo, com exatamente o bloco "Bundler mode" + "Linting" já usado em `tsconfig.app.json:10-25` / `tsconfig.node.json:9-21` (sem `lib`/`jsx`/`target`, que são decisão do host):
  ```json
  {
    "compilerOptions": {
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "isolatedModules": true,
      "moduleDetection": "force",
      "noEmit": true,
      "strict": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noFallthroughCasesInSwitch": true,
      "noUncheckedSideEffectImports": true
    }
  }
  ```
- `prepare-release-package.mjs` passa a copiar esse arquivo para `dist-package/tsconfig-base.json` (nova função `copyTsconfigBase()`, chamada em `main()`).
- Novo `exports["./tsconfig-base.json"]` (root `package.json` + `buildPackageJson()`).

### 1.3 Script de postinstall

Novo arquivo `src/postinstall/postinstall-add-lint-config.ts`, registrado como script adicional de `postinstall` (junto de `postinstall-add-script.mjs` e `download-puppeteer.mjs`, em `buildPackageJson().scripts.postinstall` e no `package.json` raiz local). Mesmo estilo defensivo de `postinstall-add-script.ts` (procura em `process.env.INIT_CWD || process.cwd()`, nunca lança, sempre loga o que fez/pulou):

- **ESLint**: procura `eslint.config.{js,mjs,ts}` no root do host.
  - Se não existir: cria `eslint.config.mjs` importando e espalhando `api-fake/eslint-config`.
  - Se já existir: só loga aviso com a linha exata a acrescentar manualmente (não escreve nada).
- **TypeScript**: procura `tsconfig.json` no root do host.
  - Se não existir: cria um mínimo `{ "extends": "api-fake/tsconfig-base.json", "include": ["**/*.ts"] }`.
  - Se existir e **não tiver** campo `"extends"`: adiciona `"extends": "api-fake/tsconfig-base.json"` ao JSON existente (seguro — filho sempre vence).
  - Se existir e **já tiver** `"extends"`: loga aviso explicando que o host já tem uma extensão configurada e sugere adicionar a base manualmente numa cadeia de extends (TS 5.0+ suporta `extends` como array).

### Arquivos tocados (Parte 1)
- `src/shared/eslint-config.ts` (novo)
- `config/tsconfig-base.json` (novo)
- `src/postinstall/postinstall-add-lint-config.ts` (novo)
- `eslint.config.js` (incluir `src/shared/**` no bloco de regras apropriado)
- `package.json` (mover deps de eslint para `dependencies`; novo script `build:shared-config`; incluir no `build`; novo `exports`)
- `tsconfig.pack-shared-config.json` (novo, seguindo o padrão dos demais `tsconfig.pack-*.json`)
- `scripts/prepare-release-package.mjs` (copiar `tsconfig-base.json`, adicionar `exports` e script de postinstall extra, incluir libs de eslint nas deps copiadas)

---

## Parte 2 — Múltiplos handlers por endpoint (objeto literal)

### 2.1 Tipos (`src/types/dynamic-endpoints.types.ts`)

```ts
export type EndpointHandlerFn = (req: Request, res: Response) => void;

export type EndpointHandlerEntry = {
  description: string;
  handler: EndpointHandlerFn;
};

export type EndpointHandlersMap = Record<string, EndpointHandlerEntry>;

export type EndpointObject = {
  description: string;
  endpointServerPrefix?: string;
  localhostEndpoint: string;
  method: EndpointMethod;
  tags?: string[];
} & (
  | { handler: EndpointHandlerFn; handlers?: never }   // legado
  | { handlers: EndpointHandlersMap; handler?: never } // novo
);
```

`isEndpointObject` passa a aceitar as duas formas (exatamente uma das duas presente): valida `typeof endpoint.handler === 'function'` OU (`endpoint.handlers` é objeto não vazio e todo valor tem `description: string` + `handler: function`).

Nova função exportada `getEndpointHandlersMap(endpoint: EndpointObject): EndpointHandlersMap` que normaliza os dois formatos — se `handler` legado, retorna `{ default: { description: endpoint.description, handler: endpoint.handler } }`. Todo o resto do sistema (server e futura UI) passa a tratar só essa forma normalizada, sem checar legado vs novo em mais de um lugar.

`EnabledEndpointRecord` continua só com `fileName` (não usado para guardar a seleção de handler — ver 2.3).

### 2.2 Persistência da seleção de handler ativo

Novo arquivo de estado no workspace, ao lado de `initialEnabledEndpoints.json`: **`activeHandlers.json`**, mapa simples `Record<fileName, handlerKey>`. Não reaproveitar `initialEnabledEndpoints.json`/`enabledAddresses` porque esse array só guarda arquivos *habilitados* (é podado a cada `buildEnabledEndpointList`) — a seleção de handler precisa sobreviver mesmo com o endpoint desabilitado.

Em `dynamic-endpoints.ts` (`ServerEndpoints`):
- Novo campo `activeHandlerSelections: Record<string, string> = {}`.
- Novo método privado `loadActiveHandlerSelectionsFile()` (mesmo padrão de `loadEnabledEndpointsFile`: cria o arquivo com `{}` se não existir, lê e faz `JSON.parse`), chamado a partir de `loadEndpoints()`.
- `saveConfigFile()` passa a escrever também esse arquivo (mais um parâmetro opcional, mesmo estilo dos dois existentes).

### 2.3 `buildEnabledEndpointList()` — resolução do handler ativo

**Caso `loadError: true`** (`endpoint === null`, `dynamic-endpoints.ts:355-374`): não há módulo importado, logo não há como saber quais handlers o arquivo declararia — a entrada em `listEndpoints` recebe `handlerOptions: []` e `activeHandlerKey: ''` (a UI já esconde o seletor quando `handlerOptions.length <= 1`, então isso não muda o componente). Importante: **não apagar** `activeHandlerSelections[fileName]` nesse ramo — o valor salvo fica intacto no arquivo/mapa em memória, só não é usado enquanto o arquivo não carregar; assim que o erro for corrigido e o arquivo recarregar, a seleção anterior volta a valer (contanto que a chave ainda exista no novo `handlers`).

**Caso normal** (`endpoint` presente), para cada `loadedModules` entry (habilitado ou não):
- `handlersMap = getEndpointHandlersMap(endpoint)`, `keys = Object.keys(handlersMap)`.
- `storedKey = activeHandlerSelections[fileName]`; `activeKey = keys.includes(storedKey) ? storedKey : keys[0]` (auto-cura: se a chave salva não existe mais — endpoint foi editado — cai pro primeiro handler declarado, e regrava `activeHandlerSelections[fileName] = activeKey`).
- Ao empurrar para `this.endpoints.listEndpoints`, incluir `handlerOptions: keys.map(k => ({ key: k, description: handlersMap[k].description }))` e `activeHandlerKey: activeKey`.
- Ao empurrar para `enabledEndpointModules` (só quando `enabled`), mudar a forma armazenada de `EndpointObject` puro para `{ endpoint: EndpointObject; activeHandler: EndpointHandlerFn }`, resolvendo `activeHandler = handlersMap[activeKey].handler`.

### 2.4 Middleware (`dynamic-endpoints-middleware.ts`)

`endpointsServer.enabledEndpointModules.find(m => m.endpoint.localhostEndpoint === req.path)` → chama `match.activeHandler(req, res)` em vez de `enabledEndpoint.handler(req, res)`.

### 2.5 Novo método + rota para trocar o handler ativo

`ServerEndpoints.changeActiveHandler(fileName: string, handlerKey: string)`:
- Acha o `loadedModules` correspondente; se não achar ou `handlerKey` não existir no mapa de handlers desse endpoint, lança erro (mesmo estilo de `enableEndpoint`'s guard).
- Atualiza `activeHandlerSelections[fileName] = handlerKey`.
- Chama `buildEnabledEndpointList()` (recalcula `activeHandler` resolvido) e `saveConfigFile()`.
- Chama `this.notifyReload()` explicitamente no final — diferente de `toggleEndpoints`, essa troca não mexe no arquivo de proxy do host, então não existe o watcher de arquivo (`fs.watchFile`) para disparar a notificação SSE sozinho.

Nova rota `src/server/routes/change-active-handler-route.ts`, mesmo formato de `change-state-endpoint-route.ts`:
```ts
app.post('/api/changeActiveHandler', (req, res, next) => {
  try {
    const { fileName, handlerKey } = req.body as { fileName: string; handlerKey: string };
    endpointsServer.changeActiveHandler(fileName, handlerKey);
    res.status(200).send('');
  } catch (error) {
    next({ error, status: 400 });
  }
});
```
Registrada em `server.ts` junto das demais rotas.

### 2.6 Tipo `Endpoint` do cliente (`src/types/endpoints.types.ts`)

Acrescentar:
```ts
handlerOptions: { key: string; description: string }[];
activeHandlerKey: string;
```

### 2.7 Cliente

- `src/client/components/ListEndpoints.tsx`: em `EndpointItem`, novo `<select>` (só renderizado quando `endpoint.handlerOptions.length > 1` — endpoints com um único handler/legado não mostram seletor) com `value={endpoint.activeHandlerKey}`, opções = `handlerOptions`, `onChange` chama nova prop `onChangeActiveHandler(fileName, handlerKey)`. Disponível tanto na seção "Habilitados" quanto "Desabilitados" (a escolha vale independente do endpoint estar ligado).
- `src/client/App.tsx`: novo `handleChangeActiveHandler` (padrão igual a `handleOpenEndpointFile` — ação imediata, não entra no fluxo de `pendingChanges`/Salvar em lote): `axios.post('/api/changeActiveHandler', {...})`, feedback de sucesso/erro, e um `await fetchEndpoints()` no final (porque, diferente de abrir arquivo, aqui o estado exibido realmente muda). Passar o callback para `<ListEndpoints onChangeActiveHandler={...} />`.

### 2.8 Documentação

Novo `docs/multiplos-handlers.md` (mesmo estilo de `docs/naming-conventions.md`) mostrando os dois formatos aceitos (`handler` legado vs `handlers: {...}` novo) para quem escreve endpoints no host.

### Arquivos tocados (Parte 2)
- `src/types/dynamic-endpoints.types.ts`, `src/types/endpoints.types.ts`, `src/types/index.ts` (exportar novos tipos/`getEndpointHandlersMap`)
- `src/server/dynamic-endpoints.ts`
- `src/server/middleware/dynamic-endpoints-middleware.ts`
- `src/server/routes/change-active-handler-route.ts` (novo)
- `src/server/server.ts` (registrar a nova rota)
- `src/client/components/ListEndpoints.tsx`, `src/client/App.tsx`
- `docs/multiplos-handlers.md` (novo)

---

## Verificação

- `npm run lint` deve passar sem novos erros (checar principalmente `consistent-type-imports` no tipo `EndpointObject` com union).
- Rodar `npm run dev:browser`, criar um endpoint de teste em `endpoints/` com `handlers: { ok: {...}, erro: {...} }` e outro com `handler` legado — confirmar na UI que:
  - o legado não mostra seletor;
  - o novo mostra os dois nomes de `description` no `<select>`;
  - trocar a seleção muda de fato a resposta HTTP retornada por aquele endereço, sem precisar habilitar/desabilitar;
  - a seleção sobrevive a um restart do servidor (lida de `activeHandlers.json`) e a uma edição do arquivo que remova a chave selecionada (cai pro primeiro handler, sem crashar).
- Para a Parte 1: rodar `npm run package:pack` e instalar o tarball gerado (`dist-target/*.tgz`) num projeto de teste vazio (sem `eslint.config.js`/`tsconfig.json`) e confirmar que ambos os arquivos são criados corretamente e que `npx eslint .`/`npx tsc --noEmit` funcionam nesse projeto de teste; repetir instalando num projeto que já tem `eslint.config.js` e `tsconfig.json` (com e sem `extends`) e confirmar que nada existente é sobrescrito, só os avisos esperados aparecem.

---

## Desvios e adições em relação a este plano

Registrado a posteriori, comparando o que foi de fato implementado na branch
`plano-refatoracao-handlers` com o que este documento previa. Ordenado do mais antigo pro mais
recente.

### 1. `fixStyle` do `consistent-type-imports` trocado de `inline-type-imports` pra `separate-type-imports`

A seção 1.1 especificava `fixStyle: 'inline-type-imports'` para a regra
`@typescript-eslint/consistent-type-imports` (tanto no `eslint.config.js` deste repo quanto no
`src/shared/eslint-config.ts` exportado). Isso foi revertido para `'separate-type-imports'`
(commit `9ee87cd`, mais a regra `@typescript-eslint/no-import-type-side-effects: error`
adicionada junto): o form inline (`import { type X }`) não é elidido pelo type-stripping nativo
do Node/TS — só o `import type { X }` como statement inteiro é removido — o que quebrava imports
de tipos vindos de pacotes sem entry point de runtime (como o próprio `api-fake` visto pelo host).
Documentado em `CLAUDE.md` (seção de convenções de ESLint).

### 2. Troca de handler ativo virou pendente/em lote, não mais imediata

A seção 2.7 descrevia `handleChangeActiveHandler` dispatando a troca **na hora**
(`axios.post` + `fetchEndpoints()` imediato), no mesmo estilo de `handleOpenEndpointFile` —
explicitamente **fora** do fluxo de `pendingChanges`/"Salvar alterações em lote".

Isso foi revertido no commit `44e349d`: a troca de handler agora **acumula** em
`pendingHandlerChanges` (mesmo padrão de `pendingChanges` para habilitar/desabilitar) e só é
enviada ao servidor quando o usuário clica em "Salvar alterações", junto com as demais mudanças
pendentes. Isso exigiu:
- `POST /api/changeActiveHandler` deixar de aceitar um único `{fileName, handlerKey}` e passar a
  aceitar um **array** de trocas (`change-active-handler-route.ts` + `ServerEndpoints` do lado do
  servidor).
- `ListEndpoints.tsx`/`App.tsx` ganharem o estado `pendingHandlerChanges` (paralelo a
  `pendingChanges`) e um badge "pendente" também para troca de handler sem toggle de
  enabled/disabled.

Motivo (do commit): manter consistência com o único outro fluxo de mutação que a UI já tinha
(habilitar/desabilitar endpoint), em vez de ter dois modelos de mutação diferentes convivendo na
mesma tela.

### 3. Refatoração da arquitetura do client (fora do escopo original do plano)

Não previsto em nenhuma das duas partes deste plano — pedido à parte pelo usuário depois que a
Parte 2 já estava concluída, porque `App.tsx` e `ListEndpoints.tsx` acumularam componentes demais
no mesmo arquivo ao longo da Parte 2 (contador de pendências, seletor de handler, badges, etc.),
prejudicando entendimento/manutenção.

- `src/client/hooks/` (novo): `useEndpoints.ts` concentra todo o estado e as fases
  fetch/save/pending-changes/SSE que antes viviam soltas em `App.tsx`; `useEndpointFilter.ts`
  concentra o texto de filtro e os regexes derivados. `App.tsx` passou a ser só composição
  (hooks + JSX), sem lógica de fetch/save misturada.
- `src/client/components/`: `FeedbackToast.tsx`, `LoadingOverlay.tsx`, `FilterBar.tsx` e
  `ActionsBar.tsx` extraídos de dentro de `App.tsx` para arquivos próprios (cada um com seu
  próprio objeto de estilos `S`).
- `src/client/components/ListEndpoints.tsx` (arquivo único) virou pasta
  `src/client/components/ListEndpoints/`, dividida em `ListEndpoints.tsx` (orquestração
  enabled/disabled), `EndpointItem.tsx`, `EndpointSection.tsx`, `EmptyMessage.tsx` e
  `PendingBadge.tsx`, com um `index.ts` de barrel para manter o import
  `from './components/ListEndpoints'` funcionando sem mudanças em `App.tsx`.
- Validado com `npm run lint`, `tsc --noEmit` (`tsconfig.app.json`), `npm run build:client`, e
  também rodando o app de verdade via `npm run dev:browser` com um workspace/endpoint de teste
  isolado (mesma técnica descrita em `conhecimento-testes-manuais.md`) dirigido por um script
  Puppeteer headless: carregamento da lista, filtro (com e sem match), toggle de checkbox gerando
  pendência, troca de handler e descartar alterações — sem erros de console, comportamento
  idêntico ao anterior à refatoração.
- Commit: `bc0a8bc` ("Refatora arquitetura do client, separando componentes e hooks por
  arquivo").

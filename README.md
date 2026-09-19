# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## 🌐 Download do Chrome em intranet com proxy

O pacote `puppeteer` já baixa o Chrome sozinho no seu próprio `postinstall`. Quando o host
padrão de download não é acessível diretamente (ex.: intranet com proxy), este pacote inclui
um segundo script de `postinstall` (`scripts/download-puppeteer.mjs`, compilado a partir de
`src/tooling/postinstall/download-puppeteer.ts`) capaz de apontar o download para um mirror interno.

Esse script só age quando o download automático do `puppeteer` foi explicitamente desativado
— caso contrário, não faz nada (evita baixar o Chrome duas vezes). Para ativá-lo, no projeto
que está instalando o pacote, antes do `npm install`:

```bash
export PUPPETEER_SKIP_DOWNLOAD=true
export PUPPETEER_DOWNLOAD_BASE_URL=https://seu-mirror-interno/chrome  # ou PUPPETEER_DOWNLOAD_HOST
npm install api-fake
```

Alternativamente, um `.puppeteerrc.cjs` com `module.exports = { skipDownload: true }` na
**raiz do projeto que está instalando** (não dentro deste pacote) tem o mesmo efeito de
desativar o download automático — o host do mirror continua vindo das env vars acima.

## 📦 Build e Empacotamento

### Build

```bash
npm run build   # build completo: tipos -> server -> client -> puppeteer -> tui -> bin -> postinstall -> shared-config
```

Cada etapa individual (`build:types`, `build:server`, `build:client`, `build:puppeteer`,
`build:tui`, `build:bin`, `build:postinstall`, `build:shared-config`) também pode ser
rodada sozinha, útil quando você está iterando só numa parte.

`npm run package:pack` (chamado pelo passo de release abaixo) faz o build completo mais
`package:prepare` (monta `dist-package/` com um `package.json` reduzido, só com o que o
pacote publicado realmente precisa) e `npm pack` (gera o `.tgz` em `dist-target/`).

### Gerando e publicando uma release completa

```bash
npm run release             # bump de patch (padrão)
npm run release -- minor    # ou major
```

Passo a passo (`src/release/full-release.ts` chama `publish-package.ts` e depois
`publish-to-consumers.ts`):

1. Exige working tree limpo — garante que o pacote publicado corresponde a um commit
   real, nunca a um work-in-progress.
2. Sobe a versão do `package.json` de verdade, via `npm version <patch|minor|major>`
   (padrão `patch`) — isso já cria commit + tag no histórico deste repo. Versão real e
   permanente, não um sufixo descartável.
3. Roda o pipeline de empacotamento existente (`npm run package:pack`): builda tudo,
   monta `dist-package/` e gera o `.tgz` em `dist-target/` via `npm pack`.
4. Copia esse `.tgz` — nome com a versão embutida (ex.: `api-fake-1.4.0.tgz`, o próprio
   nome que `npm pack` já gera) — pra um commit novo, numa branch órfã, dentro de um
   worktree temporário em `.worktrees/`. A branch é recriada do zero a cada execução,
   então nunca sobra arquivo de versão antiga junto.
5. Publica esse commit (force push) neste repo, branch `pacote-compilado` (`origin`) —
   pra clonar em qualquer máquina e instalar sem compilar nada ali.
6. Publica essa mesma branch (force push) em cada projeto consumidor configurado — ver
   "Publicando nos projetos consumidores" abaixo pra detalhes e configuração.

Não existe publicação em registry npm — a distribuição é sempre via branches git com o
`.tgz` já commitado dentro.

O commit + tag do bump de versão (passo 2) ficam só locais — nada aqui dá push sozinho
na branch de desenvolvimento (só nas branches de distribuição dos passos 5 e 6). Ao
final da execução, o passo 2 lembra o comando: `git push origin HEAD --follow-tags`.

Os passos 1–5 (`npm run package:publish`) e o passo 6 (`npm run
package:publish-consumers`) também podem ser rodados sozinhos, sem passar por `npm run
release` — útil, por exemplo, pra só re-publicar nos consumidores sem gerar uma versão
nova.

### Publicando nos projetos consumidores

```bash
npm run package:publish-consumers
```

Exige que a branch `pacote-compilado` já exista localmente (rode `npm run
package:publish`, ou `npm run release`, antes). `src/release/publish-to-consumers.ts`
pega essa mesma branch — sem buildar nada de novo — e publica (force push) em cada
consumidor configurado:

- Local — direto pro `.git` do consumidor (útil quando ele é uma pasta irmã neste
  disco).
- GitHub — pro remote `origin` de cada consumidor, pra quem clonar o consumidor numa
  outra máquina também conseguir buscar a branch.

Em ambos os casos, a branch de destino é `lib-externa/<nome-deste-pacote>` (hoje,
`lib-externa/api-fake`).

Quais consumidores existem (nome + caminho local) é informação específica de
máquina/ambiente, não pertence ao histórico deste repo — fica em
`release-consumers.local.json`, na raiz, **fora do git** (`.gitignore`). Se o arquivo não
existir, o script cria um com um template (`_example: true`, ignorado na hora de
publicar) e para, pra você preencher com os consumidores reais antes de rodar de novo:

```json
{
  "consumers": [
    { "_example": true, "name": "nome-do-consumidor", "path": "../caminho/para/o/projeto-consumidor" }
  ]
}
```

### Instalando o pacote já compilado (sem buildar nada)

Numa VDI ou máquina nova:

```bash
git clone --branch pacote-compilado --single-branch <url-do-repo> pacote-api-fake
npm install ./pacote-api-fake/api-fake-*.tgz
```

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react';

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
});
```

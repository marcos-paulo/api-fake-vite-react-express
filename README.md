# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## 🌐 Download do Chrome em intranet com proxy

O pacote `puppeteer` já baixa o Chrome sozinho no seu próprio `postinstall`. Quando o host
padrão de download não é acessível diretamente (ex.: intranet com proxy), este pacote inclui
um segundo script de `postinstall` (`scripts/download-puppeteer.mjs`, compilado a partir de
`src/postinstall/download-puppeteer.ts`) capaz de apontar o download para um mirror interno.

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
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

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
})
```

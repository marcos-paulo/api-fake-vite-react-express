# api-fake-tauri

Janela nativa (Tauri v2 + WebKitGTK) que encapsula a interface web do api-fake. É o shell
`tauri`: um jeito de abrir a mesma interface do `browser`/`puppeteer`/`electron`, sem
navegador externo e sem baixar Chromium.

O binário **não** sobe servidor nenhum. Ele só abre uma janela apontando pra interface que o
servidor do api-fake já serve. Quem sobe o servidor é o `api-fake-prod.ts` (produção) ou o
`dev:with:tauri` (desenvolvimento).

## Quando usar

- Quer janela própria, leve, sem Chromium: `api-fake --shell=tauri`.
- Máquina sem `webkit2gtk-4.1` ou com glibc < 2.34: o shell não abre. Use
  `--shell=puppeteer` ou `--shell=browser`.

## Contrato (como o Node chama este binário)

Um processo por execução. O processo termina quando a janela é fechada.

```
api-fake-tauri
```

A entrada é um JSON pelo **stdin** (não por argumento: o token do painel vai na URL, e
argumentos aparecem na lista de processos):

```json
{
  "url": "http://localhost:3342#token=...",
  "title": "api-fake",
  "width": 1280,
  "height": 800,
  "maximized": true
}
```

- `url` é obrigatório. Os outros campos são opcionais (os valores acima são o padrão).
- O fragmento `#token=...` leva o token do painel: a interface o guarda e o remove da barra.
- Erro (JSON inválido, GTK sem display, lib faltando) sai por **stderr**, com código != 0.

Quem monta essa entrada é `src/app/frontend/shells/tauri/main.ts`.

## Como gerar o binário

Compilar exige Rust e `webkit2gtk-4.1-devel`. Por isso o build roda dentro de um container
Ubuntu 22.04 (docker ou podman):

```bash
npm run build:native
```

- A imagem de build é `Dockerfile.build` nesta pasta.
- O resultado é copiado para `native-bin/api-fake-tauri`, na raiz do repositório.
- `native-bin/` **é commitado**: o pacote publicado leva o binário pronto, e quem instala não
  precisa de Docker nem de Rust.
- `target/`, `.cargo-container-cache/` e `gen/` desta pasta são artefatos e ficam no
  `.gitignore`.

## Piso de compatibilidade

O Ubuntu 22.04 é a release mais antiga com `webkit2gtk-4.1-dev`. O binário resultante pede
`GLIBC_2.34`. Não existe combinação de distro com glibc mais antiga **e** `webkit2gtk-4.1`
pra compilar contra. Em sistema mais antigo, o shell falha com uma mensagem que aponta
`puppeteer` e `browser` como alternativa.

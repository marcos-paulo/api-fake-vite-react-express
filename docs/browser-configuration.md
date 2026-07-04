# 🌐 Configuração do Browser no Vite

Este documento explica como configurar qual browser o Vite deve abrir automaticamente durante o desenvolvimento.

## 📋 Variáveis de Configuração

### `BROWSER`

Define qual browser usar ao iniciar o servidor de desenvolvimento.

**Valores aceitos:**

| Valor                | Comportamento                              |
| -------------------- | ------------------------------------------ |
| `""` (vazio)         | Não abre automaticamente                   |
| `"vscode"`           | Abre no VS Code (Simple Browser integrado) |
| `"chrome"`           | Abre no Google Chrome                      |
| `"firefox"`          | Abre no Firefox                            |
| `"/path/to/browser"` | Caminho customizado para qualquer browser  |

### `BROWSER_ARGS`

Argumentos adicionais para passar ao browser (separados por espaço).

**Exemplo:**

```
BROWSER_ARGS="--incognito --new-window"
```

---

## ⚙️ Como Configurar

### **Opção 1: Via `api-fake.config.json`** (Recomendado)

```json
{
  "APP_PORT": "3343",
  "API_PORT": "3342",
  "BROWSER": "vscode",
  "BROWSER_ARGS": ""
}
```

### **Opção 2: Via arquivo `.env`**

```env
BROWSER=vscode
BROWSER_ARGS=
```

### **Opção 3: Via variável de ambiente temporária**

```bash
BROWSER=vscode npm run dev:without:electron
```

---

## 🎯 Exemplos de Uso

### 1. Abrir no Simple Browser do VS Code (padrão)

```json
{
  "BROWSER": "vscode"
}
```

### 2. Abrir no Chrome em modo incógnito

```json
{
  "BROWSER": "google-chrome",
  "BROWSER_ARGS": "--incognito"
}
```

### 3. Não abrir automaticamente

```json
{
  "BROWSER": ""
}
```

### 4. Abrir no Firefox Developer Edition

```json
{
  "BROWSER": "/usr/bin/firefox-developer-edition"
}
```

---

## 🚀 Como o VS Code detecta localhost

Quando você configura `BROWSER=vscode` e o Vite inicia:

1. O Vite tenta abrir o browser configurado
2. O VS Code detecta que é uma URL `localhost`
3. Automaticamente oferece abrir no **Simple Browser** integrado
4. Você vê uma notificação no canto inferior direito

**Vantagens do Simple Browser:**

- ✅ Não sai do VS Code
- ✅ Visualiza frontend e código lado a lado
- ✅ Usa menos memória que um browser externo
- ✅ DevTools básicos incluídos

---

## 📝 Ordem de Precedência

A configuração do browser é lida nesta ordem (primeira encontrada é usada):

1. `api-fake.config.json` → `BROWSER`
2. Variável de ambiente `BROWSER`
3. Variável de ambiente `VSCODE_SIMPLE_BROWSER` (fallback)
4. Comportamento padrão: não abre

---

## 🔧 Troubleshooting

### O browser não abre automaticamente

**Solução:** Verifique se o valor de `BROWSER` está correto no `api-fake.config.json`

```bash
# Ver configuração atual
cat api-fake.config.json | grep BROWSER
```

### O VS Code não oferece o Simple Browser

**Motivo:** Isso é normal! O VS Code só oferece o Simple Browser para URLs localhost.

**Solução:** Use **Ctrl+Click** no link do terminal:

```
➜  Local:   http://localhost:3343/  ← Ctrl+Click aqui
```

### Quero usar sempre o browser padrão do sistema

```json
{
  "BROWSER": ""
}
```

E manualmente abra o link quando o Vite mostrar no terminal.

---

## 🎓 Scripts npm Disponíveis

```json
{
  "dev-vite": "vite", // Usa config do BROWSER
  "dev-vite-browser": "VSCODE_SIMPLE_BROWSER=true vite", // Força VS Code
  "dev:browser": "concurrently ...", // Backend + Frontend (auto-open)
  "dev:without:electron": "concurrently ..." // Backend + Frontend (sem Electron)
}
```

---

## 💡 Recomendações

**Para desenvolvimento dentro do VS Code:**

```json
{
  "BROWSER": "vscode"
}
```

**Para desenvolvimento com DevTools complexos:**

```json
{
  "BROWSER": "google-chrome"
}
```

**Para CI/CD ou testes:**

```json
{
  "BROWSER": ""
}
```

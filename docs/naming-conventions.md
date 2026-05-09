# Convenções de Nomenclatura

Guia com os critérios adotados para nomear funções, callbacks e estados neste projeto.

---

## 1. Prefixos semânticos

O prefixo de uma função comunica **o tipo de operação** que ela representa.

| Prefixo  | Tipo de operação                            | Exemplo            |
| -------- | ------------------------------------------- | ------------------ |
| `fetch`  | Busca assíncrona de dados (GET)             | `fetchEndpoints`   |
| `save`   | Persistência assíncrona de dados (POST/PUT) | `saveChanges`      |
| `handle` | Reação a uma fase de uma operação           | `handleFetchStart` |

> **`fetch` e `save`** são os **verbos da ação** — eles disparam o fluxo completo.  
> **`handle`** indica que a função é um _handler_, ou seja, ela **reage** a algo que aconteceu, não o dispara.

---

## 2. Sufixos de fase

Quando uma operação assíncrona é decomposta em callbacks individuais, o sufixo comunica **em qual momento do ciclo de vida** aquele callback atua.

| Sufixo         | Fase                | Responsabilidade típica                                           |
| -------------- | ------------------- | ----------------------------------------------------------------- |
| _(sem sufixo)_ | Disparo             | Orquestra o fluxo completo (`try/catch/finally`)                  |
| `Start`        | Início              | Ativa estado de loading, exibe feedback informativo               |
| `Success`      | Conclusão com êxito | Atualiza estado com os dados recebidos, exibe feedback de sucesso |
| `Error`        | Conclusão com falha | Loga o erro, exibe feedback de erro, reverte estado se necessário |

### Exemplo aplicado

```
fetchEndpoints        → dispara o fluxo de busca
  handleFetchStart    → ativa loading, exibe "Carregando..."
  handleFetchSuccess  → salva dados no estado, exibe "Sucesso!"
  handleFetchError    → reseta lista, exibe "Erro ao carregar"

saveChanges           → dispara o fluxo de salvamento
  handleSaveStart     → ativa loading, exibe "Salvando..."
  handleSaveSuccess   → limpa pendentes, exibe "Salvo com sucesso!"
  handleSaveError     → loga erro, exibe "Erro ao salvar"
```

---

## 3. Estado de fase (loading state)

Em vez de múltiplos booleanos independentes, prefira um único estado que descreve **o que está acontecendo**.

### ❌ Evitar — booleanos paralelos

```ts
const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(false);
const [isSaving, setIsSaving] = useState(false);

const isBlocked = isLoadingEndpoints || isSaving;
```

Problemas:

- Os dois estados são sempre lidos em conjunto (`||`)
- É possível que ambos sejam `true` simultaneamente de forma acidental
- Adicionar uma nova fase exige um terceiro booleano

### ✅ Preferir — enum de fase

```ts
type LoadingState = 'idle' | 'fetching' | 'saving';

const [loadingState, setLoadingState] = useState<LoadingState>('idle');

const isBlocked = loadingState !== 'idle';
const isSaving = loadingState === 'saving';
```

Vantagens:

- Estados mutuamente exclusivos por definição
- Adicionar uma nova fase é trivial (ex: `'deleting'`)
- O componente receptor pode receber o estado diretamente e decidir o que exibir internamente

---

## 4. Nomes que devem ser evitados

| Nome problemático           | Problema                                             | Alternativa          |
| --------------------------- | ---------------------------------------------------- | -------------------- |
| `loadingEndpoints`          | Gerúndio parece variável de estado, não função       | `handleFetchStart`   |
| `successEndpoints`          | Adjetivo sem verbo, ambíguo                          | `handleFetchSuccess` |
| `toListEndpoints`           | Prefixo `to` é convenção de conversores (`toString`) | `fetchEndpoints`     |
| `savingChanges`             | Gerúndio parece estado booleano                      | `handleSaveStart`    |
| `isSavingChangesOfEndpoint` | Verboso sem ganho semântico                          | `isSaving`           |

### Sobre gerúndios em nomes de função

Gerúndios (`loading`, `saving`, `toggling`) descrevem um **estado contínuo**, por isso são naturais em variáveis booleanas (`isLoading`, `isSaving`). Em funções, causam ambiguidade porque o leitor não sabe se está lendo uma variável ou chamando uma ação.

```ts
// Ambíguo: é variável ou função?
const loadingEndpoints = ...

// Claro: é claramente uma função com fase definida
const handleFetchStart = ...
```

---

## 5. Decomposição de callbacks

Funções assíncronas complexas devem ser decompostas em callbacks `useCallback` individuais, um para cada fase.

Isso permite:

- **Reutilização** — cada fase pode ser chamada isoladamente se necessário
- **Testabilidade** — cada callback tem uma única responsabilidade
- **Legibilidade** — a função principal (`fetchEndpoints`, `saveChanges`) descreve apenas o fluxo, não os detalhes

```ts
// Fluxo principal — só orquestra
const fetchEndpoints = useCallback(async () => {
  handleFetchStart();
  try {
    const response = await axios.get('/api/endpoints');
    handleFetchSuccess(response);
  } catch (error) {
    handleFetchError(error);
  } finally {
    setLoadingState('idle');
  }
}, [handleFetchStart, handleFetchSuccess, handleFetchError]);
```

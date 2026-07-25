# Múltiplos handlers por endpoint

Cada arquivo dentro de `endpoints/` exporta um `endpoint: EndpointObject`. Existem dois formatos
aceitos para definir a resposta desse endpoint.

---

## 1. Handler único (formato legado)

Continua funcionando normalmente — nenhuma mudança necessária em endpoints já existentes.

```ts
export const endpoint: EndpointObject = {
  description: 'Lista de usuários',
  localhostEndpoint: '/usuarios',
  method: 'get',
  handler: (req, res) => {
    res.json([{ id: 1, nome: 'Ana' }]);
  },
};
```

## 2. Múltiplos handlers nomeados

Use `handlers` (um objeto literal) em vez de `handler` para declarar várias variantes de
resposta para o mesmo endereço. A chave de cada entrada (ex: `sucesso`, `vazio`, `erro`) é o
identificador estável usado internamente — a `description` é só o texto exibido no seletor da
interface.

```ts
export const endpoint: EndpointObject = {
  description: 'Lista de usuários',
  localhostEndpoint: '/usuarios',
  method: 'get',
  handlers: {
    sucesso: {
      description: 'Sucesso com dados',
      handler: (req, res) => {
        res.json([{ id: 1, nome: 'Ana' }]);
      },
    },
    vazio: {
      description: 'Lista vazia',
      handler: (req, res) => {
        res.json([]);
      },
    },
    erro: {
      description: 'Erro 500',
      handler: (req, res) => {
        res.status(500).json({ error: 'Erro interno' });
      },
    },
  },
};
```

Quando um endpoint tem mais de um handler, a interface mostra um seletor com as `description`s
disponíveis. Trocar a seleção passa a valer imediatamente na próxima requisição àquele endereço,
sem precisar habilitar/desabilitar o endpoint. A escolha é persistida (sobrevive a um restart do
servidor) e é independente de o endpoint estar habilitado ou não.

Não é permitido declarar `handler` e `handlers` ao mesmo tempo no mesmo endpoint — escolha um dos
dois formatos.

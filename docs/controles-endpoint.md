# Controles por endpoint

Controle é um botão, switch, número ou texto que aparece no card do endpoint, no bloco **Ajustes**.
Ele muda o valor que o handler devolve, sem editar o arquivo e sem reiniciar.

## Como declarar

```ts
export const endpoint: EndpointObject = {
  title: 'Usuários',
  description: 'Lista de usuários',
  serverAddress: '/api/usuarios',
  localhostAddress: '/api/usuarios',
  method: 'get',
  controls: {
    quantidade: {
      type: 'number',
      label: 'Qtd de itens',
      default: 10,
      min: 0,
      max: 100,
      agent: true,
    },
    vazio: { type: 'switch', label: 'Lista vazia', default: false },
    perfil: {
      type: 'select',
      label: 'Perfil',
      default: 'admin',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'guest', label: 'Convidado' },
      ],
    },
    atrasoMs: { type: 'slider', label: 'Atraso (ms)', default: 0, min: 0, max: 5000, step: 100 },
  },
  handler: (req, res, { controls }) => {
    if (controls.vazio) return res.json([]);
    res.json(gerarUsuarios(controls.quantidade, controls.perfil));
  },
};
```

- O handler recebe os valores no **terceiro parâmetro**: `ctx.controls`.
- O handler só lê. Quem muda o valor é o painel (ou o agente).
- Handler com 2 parâmetros continua funcionando.
- Com vários `handlers`, cada um pode ter seus próprios `controls`.
  Eles se somam aos do endpoint. A mesma chave no handler vence.

## Tipos

- `switch`: liga ou desliga. `default` é `true` ou `false`.
- `number`: número, com `min`, `max` e `step` opcionais.
- `slider`: número com barra. `min` e `max` são obrigatórios.
- `select`: uma opção de `options` (`{ value, label }`). `default` é um `value`.
- `text`: texto livre. Veja as regras abaixo.

Campos comuns: `label` (obrigatório), `description` (ajuda curta), `default` (obrigatório), `agent`.

## Texto livre

- `maxLength`: tamanho máximo. Sem ele, vale o teto de 200 caracteres.
- `pattern`: expressão regular, escrita como string. O texto inteiro precisa casar.
  O servidor coloca `^...$` sozinho.
  - Bom: `'^[a-zA-Z0-9 ]*$'`
  - Ruim: `'.*'` (aceita qualquer coisa)
- `default` precisa passar nas duas regras.

## Valores

- O valor salvo fica em `.config/api-fake/<workspace>/controlValues.json`.
- Ele sobrevive à reinicialização.
- Valor que não passa mais no schema volta ao `default`.
- O botão de restaurar volta um controle (ou todos) ao `default`.
- O servidor valida todo valor, vindo do painel ou do agente. Valor recusado volta 400 com o motivo.
- Endpoint desabilitado mostra os controles bloqueados.
- Schema inválido (`default` fora do limite, `min` maior que `max`, `pattern` que não compila)
  faz o endpoint aparecer com erro de carga.

## Agente de IA

O agente (`api-fake-agent set-control`) só altera um controle se:

1. O endpoint está habilitado (isso é decisão humana).
2. O controle declara `agent: true`.
3. Controle `text`: também declara `maxLength` **e** `pattern`.

Faltou um requisito? O controle continua funcionando no painel.
O agente não consegue alterar, e o `list` mostra o motivo.

```bash
npm run api-fake:agent -- list
npm run api-fake:agent -- set-control users.ts quantidade 5
```

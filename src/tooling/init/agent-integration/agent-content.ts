// Conteúdo gerado pelo init pra agentes de IA. Dois textos, de propósito:
// - um bloco curto e SEMPRE carregado (AGENTS.md / CLAUDE.md), com as regras que não podem ser
//   esquecidas;
// - uma skill, carregada só quando a tarefa casa com a descrição, com o passo a passo.
// A skill segue a escrita pra leitura fácil: frase curta, lista, termo técnico explicado.

export const AGENT_SCRIPT_COMMAND = 'npm run api-fake:agent --';

export const SKILL_NAME = 'api-fake';

export const BLOCK_MARKER_START = '<!-- api-fake:agent:start -->';
export const BLOCK_MARKER_END = '<!-- api-fake:agent:end -->';

export const alwaysOnBlock = `${BLOCK_MARKER_START}
## api-fake: handlers de mock

- Para trocar o handler de um endpoint do api-fake, use só o CLI: \`${AGENT_SCRIPT_COMMAND} <list|status|set>\`.
- Nunca chame as rotas do api-fake por \`curl\` ou \`fetch\`.
- Não leia nem edite \`.config/api-fake/\` nem \`~/.config/api-fake/\`. Lá ficam as aprovações e o token de humano.
- Handler "pendente" ou "bloqueado": peça a um humano. Não tente contornar.
- O passo a passo está na skill \`${SKILL_NAME}\`.
${BLOCK_MARKER_END}
`;

export const skillMarkdown = `---
name: ${SKILL_NAME}
description: >-
  Use quando precisar trocar o handler (a função que responde) de um endpoint de mock do api-fake.
  Use também ao criar ou editar handlers de mock na pasta endpoints/.
  Não use para ligar ou desligar endpoints. Isso é decisão de um humano.
---

# api-fake: trocar handlers de mock

O api-fake responde endpoints de mock.
Cada endpoint tem um ou mais handlers.
Handler é a função que monta a resposta.
Só um handler fica ativo por endpoint.

## Antes de começar

- Entre na pasta do projeto que usa o api-fake. O CLI lê a configuração da pasta atual.
- O api-fake precisa estar rodando. Se não estiver, peça a um humano para iniciá-lo.
- Não suba o servidor por conta própria.

## Comandos

\`\`\`bash
${AGENT_SCRIPT_COMMAND} list                      # endpoints, handlers e o estado de cada um
${AGENT_SCRIPT_COMMAND} status <endpoint>         # handler ativo de um endpoint
${AGENT_SCRIPT_COMMAND} set <endpoint> <handler>  # troca o handler ativo
\`\`\`

- \`<endpoint>\` é o nome do arquivo (exemplo: \`users.ts\`) ou o endereço, se for único.
- Use \`--json\` no \`list\` e no \`status\` para ler a saída com mais facilidade.

## Estado de cada handler

- **aprovado**: um humano aprovou o código. Você pode ativar.
- **pendente**: o código é novo ou mudou. Um humano precisa aprovar no painel.
- **bloqueado**: o handler não declara \`agentControl: 'allowed'\`. Só um humano ativa.

## Quando o CLI recusar

- Não tente contornar.
- Diga ao humano o que ele precisa fazer. Exemplos: aprovar o handler no painel, ligar o endpoint.
- Endpoint desligado: só um humano liga.

## Criar ou editar handlers

- Você pode editar os arquivos em \`endpoints/\`.
- Para um handler poder ser usado por agente, declare \`agentControl: 'allowed'\` nele.
- Todo handler novo ou alterado volta a "pendente" até um humano aprovar de novo.
- A aprovação cobre só o código do próprio handler.
- Helpers importados de outros arquivos não entram na aprovação.

\`\`\`ts
handlers: {
  sucesso: {
    description: 'Responde 200 com a lista',
    agentControl: 'allowed',
    handler: (req, res) => res.json([]),
  },
}
\`\`\`

## O que nunca fazer

- Chamar as rotas do api-fake por \`curl\` ou \`fetch\`.
- Ler ou editar \`.config/api-fake/\` e \`~/.config/api-fake/\`. Lá ficam as aprovações e o token de humano.
- Usar o token do painel (\`~/.config/api-fake/panel-token\`). Ele autoriza só ações de humano.
- Ativar um handler pendente ou bloqueado por outro caminho.
`;

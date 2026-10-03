// Conteúdo gerado pelo init pra agentes de IA. Dois textos, de propósito:
// - um bloco curto e SEMPRE carregado (AGENTS.md / CLAUDE.md), com as regras que não podem ser
//   esquecidas;
// - uma skill, carregada só quando a tarefa casa com a descrição, com o passo a passo.
// A skill segue a escrita pra leitura fácil: frase curta, lista, termo técnico explicado.
// Só conhecimento do próprio api-fake: nada de nome, termo ou dado de um projeto específico.

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

// Marcador de que o arquivo foi gerado pelo init. O init só atualiza SKILL.md com esse marcador:
// uma skill escrita à mão com o mesmo caminho nunca é sobrescrita.
export const SKILL_MANAGED_MARKER = '<!-- api-fake:skill:managed';

export const skillMarkdown = `---
name: api-fake
description: >-
  Use quando precisar trocar o handler (a função que responde) de um endpoint de mock do api-fake.
  Use também para investigar por que uma chamada recebeu certa resposta.
  Use ao criar ou editar handlers na pasta endpoints/ e ao simular respostas.
  Não use para ligar ou desligar endpoints. Isso é decisão de um humano.
---

<!-- api-fake:skill:managed
Arquivo gerado pelo api-fake-init. Edições manuais são sobrescritas na próxima execução.
Para ter uma skill sua, apague este arquivo ou use outro nome de pasta. -->

# api-fake: operar handlers de mock

O api-fake responde endpoints de mock.
Cada endpoint tem um ou mais handlers.
Handler é a função que monta a resposta.
Só um handler fica ativo por endpoint.

## Antes de começar

- Entre na pasta do projeto que usa o api-fake. O CLI lê a configuração da pasta atual.
- O api-fake precisa estar rodando. Se não estiver, peça a um humano para iniciá-lo.
- Não suba, reinicie nem encerre processos do api-fake por conta própria.

## Comandos

\`\`\`bash
npm run api-fake:agent -- list                      # endpoints, handlers e o estado de cada um
npm run api-fake:agent -- status <endpoint>         # handler ativo de um endpoint
npm run api-fake:agent -- set <endpoint> <handler>  # troca o handler ativo
\`\`\`

- \`<endpoint>\` é o nome do arquivo (exemplo: \`users.ts\`) ou o endereço, se for único.
- Use \`--json\` no \`list\` e no \`status\` para ler a saída com mais facilidade.

## Estado de cada handler

- **aprovado**: um humano aprovou o código. Você pode ativar.
- **pendente**: o código é novo ou mudou. Um humano precisa aprovar no painel.
- **bloqueado**: o handler não declara \`agentControl: 'allowed'\`. Só um humano ativa.

## O que está respondendo agora

- A resposta vem do handler ativo de um endpoint habilitado.
- Um handler existir no arquivo não prova que ele está respondendo.
- Um endpoint desligado não responde, mesmo com handlers no arquivo.
- Use o \`list\` para ver se o endpoint está habilitado e qual handler está ativo.
- Se o handler salvo não existir mais, o servidor usa o primeiro handler do arquivo.
- Não leia os arquivos de \`.config/api-fake/\` para descobrir isso. O \`list\` já informa.

## Como o servidor trata uma chamada

- O servidor compara o caminho da chamada com o endereço local do endpoint (\`localhostAddress\`).
- Se o endpoint está habilitado, ele chama o handler ativo.
- Se o endpoint existe mas está desligado, a resposta é 404.
- Se nenhum endpoint casa, a chamada segue como uma rota normal do servidor.

## Quando o CLI recusar

- Não tente contornar.
- Diga ao humano o que ele precisa fazer. Exemplos: aprovar o handler no painel, ligar o endpoint.
- Endpoint desligado: só um humano liga.

## Recarga ao editar arquivos

- O servidor observa os arquivos \`.ts\` e \`.js\` da pasta de endpoints.
- Depois de uma alteração, ele espera cerca de 500 ms, recarrega o módulo e avisa as interfaces.
- Não reinicie nada por padrão. Confirme a recarga nos logs.
- Alguns editores salvam trocando o arquivo. O servidor pode perder a observação desse arquivo.
- Se a recarga não aparecer nos logs, avise o humano. Não reinicie por conta própria.

## Logs

- Ficam em \`.logs/api-fake/\`.
- \`requests.log\` (ou \`requests.dev.log\` em desenvolvimento) tem uma linha por chamada: \`METHOD caminho -> status (duração)\`.
- \`backend.log\` (ou \`backend.dev.log\`) tem erros de carregamento e mensagens de recarga.
- Filtre por horário, rota ou status. Não despeje o arquivo inteiro.
- Os logs podem conter dados de negócio. Não reproduza trechos sem necessidade.

## Investigar uma chamada

1. Descubra qual arquivo de endpoint atende o caminho da chamada.
2. Rode o \`list\` e veja se o endpoint está habilitado e qual handler está ativo.
3. Leia o arquivo do endpoint: método, endereço e handlers.
4. Procure a chamada no \`requests.log\` pelo horário e pela rota.
5. Diferencie os casos:
   - mock respondendo 200;
   - erro HTTP proposital;
   - falha ao encaminhar a chamada para outro servidor;
   - endpoint desligado ou não encontrado;
   - erro mostrado pela aplicação.
6. Uma mensagem de erro na tela não prova que falta cadastrar um endpoint.
7. Se o mock respondeu 200 e os logs não mostram erro, a causa está fora do api-fake. Investigue lá antes de alterar endpoints.

## Simular respostas

- Para simular, altere os dados do handler que já está ativo.
- Não troque o handler nem mude configurações só para variar uma resposta.
- Antes de editar, rode \`git status\`. Preserve alterações que já existiam.
- Registre o valor atual antes de mudar.
- Faça uma alteração pequena e pontual.
- Espere a recarga e confirme no \`backend.log\`.
- Dispare só a operação necessária e confira o status no \`requests.log\`.
- Ao terminar, restaure os valores temporários e confira o diff.
- Se a pessoa pediu para manter o cenário, diga quais valores ficaram no mock.
- Não dispare ações irreversíveis da aplicação só para testar uma resposta. Prefira validar a consulta ou a tela anterior.

Editar o código de um handler aprovado o torna pendente de novo.
Isso não afeta um handler que um humano ativou.
Um handler que você ativou volta ao anterior quando deixa de estar aprovado.

Precisa de uma variação nova?

- Crie um handler novo no arquivo, com \`agentControl: 'allowed'\`.
- Peça a um humano para aprová-lo.
- Só depois use o \`set\`.

## Handlers com espera ou contador

- Um handler pode responder depois de uma espera (\`setTimeout\` ou \`Promise\`).
- Um handler pode variar a resposta pela chamada ou por um contador no módulo.
- Envie a resposta uma única vez.
- Trate as falhas da espera com \`try/catch\`. O servidor não aguarda o handler e não captura erro dele.
- A linha do \`requests.log\` é gravada quando a resposta termina. A duração inclui a espera.
- Se o handler nunca responder, o log mostra "conexão encerrada sem resposta".
- Contador em memória zera quando o módulo recarrega.
- Em chamadas ao mesmo tempo, a ordem de término pode ser diferente da ordem de chegada. Atualize o contador antes da espera.

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

## Ao concluir

Informe:

- quais operações você verificou;
- quais arquivos e valores você alterou;
- o handler ativo de cada endpoint envolvido;
- os resultados HTTP importantes;
- o que ficou sem verificar.

Não diga que testou tudo se testou só parte.

## O que nunca fazer

- Chamar as rotas do api-fake por \`curl\` ou \`fetch\`.
- Ler ou editar \`.config/api-fake/\` e \`~/.config/api-fake/\`. Lá ficam as aprovações e o token de humano.
- Usar o token do painel (\`~/.config/api-fake/panel-token\`). Ele autoriza só ações de humano.
- Ativar um handler pendente ou bloqueado por outro caminho.
`;

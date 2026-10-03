import fs from 'node:fs';
import path from 'node:path';

const AGENT_SCRIPT_COMMAND = 'npm run api-fake:agent --';

const MARKER_START = '<!-- api-fake:agent:start -->';
const MARKER_END = '<!-- api-fake:agent:end -->';

const agentInstructionsBlock = `${MARKER_START}
## api-fake: alternar handlers de mock

O api-fake responde endpoints de mock. Cada endpoint tem handlers (variantes de resposta).
Você troca o handler ativo pelo CLI. Nunca por HTTP direto (curl/fetch).

\`\`\`bash
${AGENT_SCRIPT_COMMAND} list                      # endpoints, handlers e o estado de cada um
${AGENT_SCRIPT_COMMAND} status <endpoint>         # handler ativo de um endpoint
${AGENT_SCRIPT_COMMAND} set <endpoint> <handler>  # troca o handler ativo
\`\`\`

Regras:

- Só handlers "aprovado" podem ser ativados por você.
- "pendente": o código é novo ou mudou. Um humano precisa aprovar no painel. Peça e espere.
- "bloqueado": o handler não declara \`agentControl: 'allowed'\`. Só um humano ativa.
- Endpoint desligado: só um humano liga.
- Se o CLI recusar, não tente contornar. Avise o humano e diga o que ele precisa fazer.
- Se o api-fake não estiver rodando, peça para um humano iniciá-lo.

Criar ou editar handlers:

- Você pode editar os arquivos em \`endpoints/\`.
- Para um handler poder ser usado por agente, declare \`agentControl: 'allowed'\` nele.
- Todo handler novo ou alterado volta a "pendente" até um humano aprovar de novo.
- A aprovação cobre só o código do próprio handler. Helpers importados de outros arquivos não entram no hash.
- Não edite nada em \`.config/api-fake/\`. Essa pasta guarda as aprovações humanas.
- Não leia nem use o token do painel (\`~/.config/api-fake/panel-token\`). Ele autoriza só ações de humano.
${MARKER_END}
`;

const SETTINGS_PERMISSIONS = {
  allow: ['Bash(npm run api-fake:agent:*)', 'Bash(npx api-fake-agent:*)'],
  deny: [
    'Edit(.config/api-fake/**)',
    'Write(.config/api-fake/**)',
    'Read(~/.config/api-fake/**)',
    'Edit(~/.config/api-fake/**)',
    'Write(~/.config/api-fake/**)',
  ],
};

function pickInstructionsFile(targetDir: string): string {
  const candidates = ['AGENTS.md', 'CLAUDE.md'];
  const existing = candidates.find((fileName) => fs.existsSync(path.join(targetDir, fileName)));
  return path.join(targetDir, existing ?? 'AGENTS.md');
}

function setupInstructionsBlock(targetDir: string) {
  const filePath = pickInstructionsFile(targetDir);
  const fileName = path.basename(filePath);
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';

  const start = current.indexOf(MARKER_START);
  const end = current.indexOf(MARKER_END);

  if (start !== -1 && end > start) {
    const updated =
      current.slice(0, start) +
      agentInstructionsBlock.trimEnd() +
      current.slice(end + MARKER_END.length);

    if (updated !== current) {
      fs.writeFileSync(filePath, updated);
      console.log(`[api-fake] Bloco de instruções do agente atualizado em "${fileName}".`);
    }
    return;
  }

  const separator =
    current && !current.endsWith('\n\n') ? (current.endsWith('\n') ? '\n' : '\n\n') : '';
  fs.writeFileSync(filePath, `${current}${separator}${agentInstructionsBlock}`);
  console.log(`[api-fake] Bloco de instruções do agente adicionado em "${fileName}".`);
}

function mergeUnique(existing: unknown, additions: string[]): string[] {
  const list = Array.isArray(existing) ? (existing as string[]) : [];
  return [...list, ...additions.filter((entry) => !list.includes(entry))];
}

function setupClaudePermissions(targetDir: string) {
  const settingsPath = path.join(targetDir, '.claude', 'settings.json');

  let settings: Record<string, unknown> = {};

  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      console.warn(
        '[api-fake] ".claude/settings.json" não é um JSON válido e não foi alterado. ' +
          `Adicione manualmente em permissions.allow: ${SETTINGS_PERMISSIONS.allow.join(', ')} ` +
          `e em permissions.deny: ${SETTINGS_PERMISSIONS.deny.join(', ')}.`,
      );
      return;
    }
  }

  const permissions = (settings.permissions ?? {}) as Record<string, unknown>;
  const allow = mergeUnique(permissions.allow, SETTINGS_PERMISSIONS.allow);
  const deny = mergeUnique(permissions.deny, SETTINGS_PERMISSIONS.deny);

  const changed =
    JSON.stringify(allow) !== JSON.stringify(permissions.allow) ||
    JSON.stringify(deny) !== JSON.stringify(permissions.deny);

  if (!changed) return;

  settings.permissions = { ...permissions, allow, deny };
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  console.log('[api-fake] Permissões do agente adicionadas em ".claude/settings.json".');
}

/**
 * Prepara o projeto consumidor para um agente de IA alternar handlers pelo CLI:
 * instruções (AGENTS.md/CLAUDE.md) e permissões do Claude Code. O script npm
 * `api-fake:agent` é criado em setup-package-scripts.ts, junto com os demais.
 */
export function setupAgentIntegration(targetDir: string) {
  setupInstructionsBlock(targetDir);
  setupClaudePermissions(targetDir);

  console.warn(
    '[api-fake] Atenção: as permissões negam Edit/Write em ".config/api-fake/**" e a leitura do token ' +
      'do painel em "~/.config/api-fake/**", mas não impedem leitura ou escrita via shell (cat, ' +
      'echo...). Para fechar isso, negue também esses comandos nas permissões do seu agente, ' +
      'ou rode-o em sandbox.',
  );
}

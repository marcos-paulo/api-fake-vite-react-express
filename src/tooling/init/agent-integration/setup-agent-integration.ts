import fs from 'node:fs';
import path from 'node:path';

import { readJsonFile, writeJsonFileIfChanged } from '../json-file';
import {
  alwaysOnBlock,
  BLOCK_MARKER_END,
  BLOCK_MARKER_START,
  SKILL_NAME,
  skillMarkdown,
} from './agent-content';
import { chooseAgent } from './choose-agent';
import { getGlobalTools, linkGlobalSkill } from './link-global-skill';

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

/** Devolve true se alterou o arquivo. */
function setupInstructionsBlock(targetDir: string, fileName: string): boolean {
  const filePath = path.join(targetDir, fileName);
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';

  const start = current.indexOf(BLOCK_MARKER_START);
  const end = current.indexOf(BLOCK_MARKER_END);

  if (start !== -1 && end === -1) {
    console.warn(
      `[api-fake] "${fileName}" tem o marcador de início do bloco do agente, mas não o de fim. ` +
        'Não foi alterado: corrija os marcadores e rode o init de novo.',
    );
    return false;
  }

  if (start !== -1 && end > start) {
    const updated =
      current.slice(0, start) +
      alwaysOnBlock.trimEnd() +
      current.slice(end + BLOCK_MARKER_END.length);

    if (updated === current) return false;

    fs.writeFileSync(filePath, updated);
    console.log(`[api-fake] Bloco de instruções do agente atualizado em "${fileName}".`);
    return true;
  }

  const separator = current
    ? current.endsWith('\n\n')
      ? ''
      : current.endsWith('\n')
        ? '\n'
        : '\n\n'
    : '';
  fs.writeFileSync(filePath, `${current}${separator}${alwaysOnBlock}`);
  console.log(`[api-fake] Bloco de instruções do agente adicionado em "${fileName}".`);
  return true;
}

/** Skill do projeto (versionável, vale pra todo o time). Devolve true se gravou. */
function setupProjectSkill(targetDir: string, skillsRelativeDir: string): boolean {
  const skillFile = path.join(targetDir, skillsRelativeDir, SKILL_NAME, 'SKILL.md');

  if (fs.existsSync(skillFile) && fs.readFileSync(skillFile, 'utf-8') === skillMarkdown) {
    return false;
  }

  const existed = fs.existsSync(skillFile);
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, skillMarkdown);
  console.log(
    `[api-fake] Skill ${existed ? 'atualizada' : 'criada'} em "${path.join(skillsRelativeDir, SKILL_NAME, 'SKILL.md')}".`,
  );
  return true;
}

function mergeUnique(existing: unknown, additions: string[]): string[] {
  const list = Array.isArray(existing) ? (existing as string[]) : [];
  return [...list, ...additions.filter((entry) => !list.includes(entry))];
}

/** Devolve true se acrescentou alguma permissão. */
function setupClaudePermissions(targetDir: string): boolean {
  const settingsPath = path.join(targetDir, '.claude', 'settings.json');

  const existingFile = fs.existsSync(settingsPath) ? readJsonFile(settingsPath) : null;

  if (fs.existsSync(settingsPath) && !existingFile) {
    console.warn(
      '[api-fake] ".claude/settings.json" não é um JSON válido e não foi alterado. ' +
        `Adicione manualmente em permissions.allow: ${SETTINGS_PERMISSIONS.allow.join(', ')} ` +
        `e em permissions.deny: ${SETTINGS_PERMISSIONS.deny.join(', ')}.`,
    );
    return false;
  }

  const file = existingFile ?? {
    data: {} as Record<string, unknown>,
    indent: 2,
    endsWithNewline: true,
    raw: '',
  };

  const permissions = (file.data.permissions ?? {}) as Record<string, unknown>;
  const allow = mergeUnique(permissions.allow, SETTINGS_PERMISSIONS.allow);
  const deny = mergeUnique(permissions.deny, SETTINGS_PERMISSIONS.deny);

  const changed =
    allow.length !== (Array.isArray(permissions.allow) ? permissions.allow.length : 0) ||
    deny.length !== (Array.isArray(permissions.deny) ? permissions.deny.length : 0);

  if (!changed) return false;

  file.data.permissions = { ...permissions, allow, deny };
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  writeJsonFileIfChanged(settingsPath, file);
  console.log('[api-fake] Permissões do agente adicionadas em ".claude/settings.json".');
  return true;
}

function setupClaude(targetDir: string) {
  const changed = [
    setupInstructionsBlock(targetDir, 'CLAUDE.md'),
    setupProjectSkill(targetDir, path.join('.claude', 'skills')),
    setupClaudePermissions(targetDir),
  ];

  linkGlobalSkill(
    getGlobalTools().claude,
    path.join(targetDir, '.claude', 'skills', SKILL_NAME),
    changed.some(Boolean),
  );

  // O aviso só faz sentido na execução que acabou de gravar algo.
  if (changed.some(Boolean)) {
    console.warn(
      '[api-fake] Claude Code: as permissões negam Edit/Write em ".config/api-fake/**" e a leitura do ' +
        'token do painel em "~/.config/api-fake/**", mas não impedem leitura ou escrita via shell ' +
        '(cat, echo...). Para fechar isso, negue também esses comandos, ou rode o agente em sandbox.',
    );
  }
}

function setupCopilot(targetDir: string) {
  const changed = [
    setupInstructionsBlock(targetDir, 'AGENTS.md'),
    setupProjectSkill(targetDir, path.join('.github', 'skills')),
  ];

  linkGlobalSkill(
    getGlobalTools().copilot,
    path.join(targetDir, '.github', 'skills', SKILL_NAME),
    changed.some(Boolean),
  );

  // O init NÃO gera configuração de permissão do Copilot: o CLI usa flags de linha de comando e,
  // no VS Code, um arquivo de configuração versionado que libera comandos é um risco.
  if (changed.some(Boolean)) {
    console.warn(
      '[api-fake] GitHub Copilot: o init não gera permissões pra ele. No Copilot CLI, use ' +
        '--deny-tool para negar "shell(curl)" e escrita em ".config/api-fake". No VS Code, use ' +
        '"chat.tools.terminal.autoApprove" nas suas configurações de usuário.',
    );
  }
}

/**
 * Prepara o projeto consumidor para um agente de IA alternar handlers pelo CLI. Pergunta (ou lê de
 * --agent=) pra qual agente gerar: Claude Code, GitHub Copilot ou os dois. Gera instruções sempre
 * ativas, a skill do projeto e, na pasta global de cada ferramenta, um link simbólico pra essa skill.
 *
 * O script npm `api-fake:agent` é criado em setup-package-scripts.ts e o .gitignore em
 * setup-gitignore.ts.
 *
 * Idempotente: rodar de novo não altera nada e não imprime nada.
 */
export async function setupAgentIntegration(targetDir: string) {
  const choice = await chooseAgent(targetDir);

  if (choice === 'none') return;

  if (choice === 'claude' || choice === 'both') setupClaude(targetDir);
  if (choice === 'copilot' || choice === 'both') setupCopilot(targetDir);
}

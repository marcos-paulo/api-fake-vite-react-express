import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';

import { BLOCK_MARKER_START, SKILL_NAME } from './agent-content';

export type AgentChoice = 'claude' | 'copilot' | 'both' | 'none';

const VALID_CHOICES: AgentChoice[] = ['claude', 'copilot', 'both', 'none'];

function isAgentChoice(value: string): value is AgentChoice {
  return (VALID_CHOICES as string[]).includes(value);
}

function fileHasBlock(filePath: string): boolean {
  return fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf-8').includes(BLOCK_MARKER_START);
}

function fromFlag(argv: string[]): AgentChoice | null | 'invalid' {
  const flag = argv.find((arg) => arg.startsWith('--agent='));
  if (!flag) return null;

  const value = flag.slice('--agent='.length);
  return isAgentChoice(value) ? value : 'invalid';
}

// O que já foi gerado numa execução anterior. Dispensa guardar a escolha em algum arquivo:
// os próprios arquivos dizem pra qual agente o init já rodou.
export function detectAgents(targetDir: string): AgentChoice | null {
  const claude =
    fs.existsSync(path.join(targetDir, '.claude', 'skills', SKILL_NAME, 'SKILL.md')) ||
    fileHasBlock(path.join(targetDir, 'CLAUDE.md'));
  const copilot =
    fs.existsSync(path.join(targetDir, '.github', 'skills', SKILL_NAME, 'SKILL.md')) ||
    fileHasBlock(path.join(targetDir, 'AGENTS.md'));

  if (claude && copilot) return 'both';
  if (claude) return 'claude';
  if (copilot) return 'copilot';
  return null;
}

async function askInteractively(): Promise<AgentChoice> {
  const options: Record<string, AgentChoice> = {
    '1': 'claude',
    '2': 'copilot',
    '3': 'both',
    '4': 'none',
  };

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const answer = (
        await rl.question(
          '[api-fake] Para qual agente de IA criar os arquivos?\n' +
            '  1) Claude Code\n  2) GitHub Copilot\n  3) Os dois\n  4) Nenhum\nEscolha [1-4]: ',
        )
      ).trim();

      if (answer in options) return options[answer];
    }
  } finally {
    rl.close();
  }

  return 'none';
}

/**
 * Decide pra qual agente gerar os arquivos:
 * 1. `--agent=claude|copilot|both|none` (sempre vence; só acrescenta, nunca remove);
 * 2. o que já existe de uma execução anterior (não pergunta de novo);
 * 3. terminal interativo: pergunta;
 * 4. sem terminal (CI, script): não gera nada e avisa como escolher.
 */
export async function chooseAgent(
  targetDir: string,
  argv: string[] = process.argv,
): Promise<AgentChoice> {
  const flag = fromFlag(argv);

  if (flag === 'invalid') {
    console.warn(
      `[api-fake] Valor inválido em --agent. Use: ${VALID_CHOICES.join(', ')}. Arquivos de agente não foram gerados.`,
    );
    return 'none';
  }

  if (flag) return flag;

  const detected = detectAgents(targetDir);
  if (detected) return detected;

  if (process.stdin.isTTY && process.stdout.isTTY) return askInteractively();

  console.warn(
    '[api-fake] Sem terminal interativo e sem --agent: arquivos de agente não foram gerados. ' +
      'Rode "api-fake-init --agent=claude|copilot|both" para gerá-los.',
  );
  return 'none';
}

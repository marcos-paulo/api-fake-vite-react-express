import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { SKILL_NAME } from './agent-content';

export type GlobalTool = {
  label: string;
  /** Pasta global da ferramenta (ex.: ~/.claude). Se não existe, a ferramenta não está instalada. */
  baseDir: string;
  /** Subpasta de skills dentro dela. */
  skillsSubdir: string;
};

export function getGlobalTools(): Record<'claude' | 'copilot', GlobalTool> {
  const home = os.homedir();
  return {
    claude: { label: 'Claude Code', baseDir: path.join(home, '.claude'), skillsSubdir: 'skills' },
    copilot: {
      label: 'GitHub Copilot',
      baseDir: path.join(home, '.copilot'),
      skillsSubdir: 'skills',
    },
  };
}

function realPathOrResolved(filePath: string): string {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

/**
 * Cria o link simbólico <pasta global da ferramenta>/skills/api-fake -> pasta da skill DENTRO
 * DO PROJETO. O projeto continua sendo a fonte: rodar o init de novo atualiza a skill e o link
 * enxerga a versão nova.
 *
 * Só mexe no que é do api-fake:
 * - ferramenta sem pasta global: não cria nada (não instala pasta de ferramenta que a pessoa
 *   não usa) e avisa uma vez;
 * - link já correto: não faz nada, nem imprime;
 * - link quebrado (o projeto apontado foi movido ou apagado): aponta pra este projeto;
 * - link vivo apontando pra OUTRO projeto: avisa e não toca (o outro projeto é o dono);
 * - qualquer outra coisa no lugar (pasta, arquivo): avisa e não toca.
 */
export function linkGlobalSkill(
  tool: GlobalTool,
  projectSkillDir: string,
  announceMissingTool: boolean,
) {
  if (process.platform === 'win32') {
    console.warn(
      `[api-fake] Link global da skill pulado (${tool.label}): links simbólicos no Windows ` +
        'exigem permissão especial.',
    );
    return;
  }

  if (!fs.existsSync(tool.baseDir)) {
    // Só avisa na execução que acabou de gerar arquivos: nas seguintes seria ruído repetido.
    if (!announceMissingTool) return;
    console.log(
      `[api-fake] ${tool.label}: pasta global "${tool.baseDir}" não existe, link da skill não criado.`,
    );
    return;
  }

  const target = path.resolve(projectSkillDir);
  const skillsDir = path.join(tool.baseDir, tool.skillsSubdir);
  const linkPath = path.join(skillsDir, SKILL_NAME);

  let existing: fs.Stats | null = null;
  try {
    existing = fs.lstatSync(linkPath);
  } catch {
    existing = null;
  }

  if (existing?.isSymbolicLink()) {
    const currentTarget = path.resolve(skillsDir, fs.readlinkSync(linkPath));

    if (realPathOrResolved(currentTarget) === realPathOrResolved(target)) return;

    if (fs.existsSync(linkPath)) {
      console.warn(
        `[api-fake] "${linkPath}" já aponta para outro projeto (${currentTarget}) e não foi alterado.`,
      );
      return;
    }

    // Quebrado: o destino antigo não existe mais. Seguro trocar.
    fs.unlinkSync(linkPath);
    fs.symlinkSync(target, linkPath, 'dir');
    console.log(
      `[api-fake] Link quebrado refeito: ${linkPath} -> ${target} (apontava para ${currentTarget}).`,
    );
    return;
  }

  if (existing) {
    console.warn(
      `[api-fake] "${linkPath}" já existe e não é um link do api-fake. Não foi alterado.`,
    );
    return;
  }

  fs.mkdirSync(skillsDir, { recursive: true });
  fs.symlinkSync(target, linkPath, 'dir');
  console.log(`[api-fake] Link criado: ${linkPath} -> ${target}`);
}

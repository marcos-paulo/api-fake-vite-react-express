import fs from 'node:fs';
import path from 'node:path';

const MARKER_START = '# api-fake:start';
const MARKER_END = '# api-fake:end';

// Só o estado local gerado em tempo de execução. O `api-fake.config.json` (em
// .config/api-fake/, fora das subpastas) NÃO entra: é configuração do projeto e a decisão de
// versioná-lo é da pessoa. `/*/` casa só diretórios, que são as pastas por workspace com
// handlers ativos, endpoints habilitados, aprovações e escolhas de agente.
const ignoreBlock = `${MARKER_START}
# Estado local do api-fake (não versionar)
.config/api-fake/*/
.logs/api-fake/
${MARKER_END}
`;

/**
 * Mantém o bloco do api-fake no .gitignore do projeto destino. Só age se o projeto usa git
 * (existe .gitignore ou .git): não cria .gitignore à toa. Idempotente.
 */
export function setupGitignore(targetDir: string) {
  const gitignorePath = path.join(targetDir, '.gitignore');
  const usesGit = fs.existsSync(gitignorePath) || fs.existsSync(path.join(targetDir, '.git'));

  if (!usesGit) return;

  const current = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';

  const start = current.indexOf(MARKER_START);
  const end = current.indexOf(MARKER_END);

  if (start !== -1 && end === -1) {
    console.warn(
      '[api-fake] ".gitignore" tem o marcador de início do bloco do api-fake, mas não o de fim. ' +
        'Não foi alterado: corrija os marcadores e rode o init de novo.',
    );
    return;
  }

  if (start !== -1 && end > start) {
    const updated =
      current.slice(0, start) + ignoreBlock.trimEnd() + current.slice(end + MARKER_END.length);

    if (updated !== current) {
      fs.writeFileSync(gitignorePath, updated);
      console.log('[api-fake] Bloco do api-fake atualizado em ".gitignore".');
    }
    return;
  }

  const separator = current
    ? current.endsWith('\n\n')
      ? ''
      : current.endsWith('\n')
        ? '\n'
        : '\n\n'
    : '';
  fs.writeFileSync(gitignorePath, `${current}${separator}${ignoreBlock}`);
  console.log('[api-fake] Estado local do api-fake adicionado ao ".gitignore".');
}

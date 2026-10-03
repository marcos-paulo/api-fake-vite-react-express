import { execFileSync, spawnSync } from 'node:child_process';

// Commits e tags feitos pelo pipeline de release. Se o helper local `commit-padrao.sh` estiver no
// PATH, o commit passa por ele; senão, é um `git commit` comum.

function commandExists(command: string): boolean {
  return spawnSync('sh', ['-c', `command -v ${command}`], { stdio: 'ignore' }).status === 0;
}

/** Commita o que já está staged em `cwd`. */
export function commitStaged(message: string, cwd: string) {
  if (commandExists('commit-padrao.sh')) {
    execFileSync('commit-padrao.sh', [message], { cwd, stdio: 'inherit' });
    return;
  }

  execFileSync('git', ['commit', '-m', message], { cwd, stdio: 'inherit' });
}

/** Tag anotada no HEAD, datada como o commit. */
export function tagHead(cwd: string, tagName: string, message: string) {
  const commitDate = execFileSync('git', ['log', '-1', '--format=%cI'], { cwd }).toString().trim();

  execFileSync('git', ['tag', '-a', tagName, '-m', message], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, GIT_COMMITTER_DATE: commitDate },
  });
}

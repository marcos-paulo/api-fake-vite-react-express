import { execFileSync } from 'node:child_process';
import path from 'node:path';

export function runTsup(rootDir: string, args: string[]) {
  execFileSync(path.join(rootDir, 'node_modules', '.bin', 'tsup'), args, {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

export function runNpmScript(rootDir: string, scriptName: string) {
  execFileSync('npm', ['run', scriptName], { cwd: rootDir, stdio: 'inherit' });
}

export function runTsxScript(rootDir: string, scriptRelativePath: string, args: string[] = []) {
  execFileSync(path.join(rootDir, 'node_modules', '.bin', 'tsx'), [scriptRelativePath, ...args], {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

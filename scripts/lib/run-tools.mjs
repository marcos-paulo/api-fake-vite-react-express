import { execFileSync } from 'node:child_process';
import path from 'node:path';

export function runTsup(rootDir, args) {
  execFileSync(path.join(rootDir, 'node_modules', '.bin', 'tsup'), args, {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

export function runNpmScript(rootDir, scriptName) {
  execFileSync('npm', ['run', scriptName], { cwd: rootDir, stdio: 'inherit' });
}

export function runNodeScript(rootDir, scriptRelativePath, args = []) {
  execFileSync('node', [scriptRelativePath, ...args], { cwd: rootDir, stdio: 'inherit' });
}

import fs from 'node:fs';
import path from 'node:path';

const targetArg = process.argv[2];

if (!targetArg) {
  console.error('Uso: node ./scripts/fix-cli-shebang.mjs <arquivo>');
  process.exit(1);
}

const targetPath = path.resolve(process.cwd(), targetArg);

if (!fs.existsSync(targetPath)) {
  console.error(`Arquivo nao encontrado: ${targetPath}`);
  process.exit(1);
}

const source = fs.readFileSync(targetPath, 'utf8');
const shebang = '#!/usr/bin/env node\n';
const output = source.startsWith(shebang) ? source : shebang + source;

fs.writeFileSync(targetPath, output);
fs.chmodSync(targetPath, 0o755);

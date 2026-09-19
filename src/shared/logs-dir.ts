import fs from 'node:fs';
import path from 'node:path';

// Mesma resolução usada por shared/config.ts pro api-fake.config.json: raiz do
// consumidor em produção (API_FAKE_WORKDIR), raiz do repo em dev (cwd do
// processo `npm run dev`). A pasta de logs fica ao lado dele por padrão, mas o
// caller pode passar um baseDir explícito (ex.: repoRoot já resolvido a partir
// de __dirname, mais confiável que depender do cwd no boot de dev).
// `.logs/api-fake` (não só `logs`) pra não colidir com uma pasta de logs que o
// próprio projeto consumidor já use, e deixar claro que aquele conteúdo é
// gerado por este pacote.
export function ensureLogsDir(baseDir: string = process.env.API_FAKE_WORKDIR ?? process.cwd()): string {
  const dir = path.join(baseDir, '.logs', 'api-fake');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

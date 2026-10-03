import fs from 'node:fs';

export type JsonFile = {
  data: Record<string, unknown>;
  indent: string | number;
  endsWithNewline: boolean;
  raw: string;
};

/** Lê um JSON de objeto. Devolve null se o arquivo não existe ou não é JSON válido. */
export function readJsonFile(filePath: string): JsonFile | null {
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');

  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

    // Preserva o recuo (tabs ou N espaços) e a quebra de linha final do arquivo original:
    // regravar com outro formato reescreveria o arquivo inteiro do usuário por nada.
    const indent = /^([ \t]+)"/m.exec(raw)?.[1] ?? 2;

    return {
      data: data as Record<string, unknown>,
      indent,
      endsWithNewline: raw.endsWith('\n'),
      raw,
    };
  } catch {
    return null;
  }
}

/** Grava só se o conteúdo mudou. Devolve true se gravou. */
export function writeJsonFileIfChanged(filePath: string, file: JsonFile): boolean {
  const content = `${JSON.stringify(file.data, null, file.indent)}${file.endsWithNewline ? '\n' : ''}`;
  if (content === file.raw) return false;

  fs.writeFileSync(filePath, content);
  return true;
}

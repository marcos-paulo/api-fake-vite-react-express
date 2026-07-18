import { register } from 'node:module';

/**
 * O Node resolve TS nativamente (type-stripping) desde a v22.18, mas a resolução de
 * módulos ESM continua exigindo extensão explícita em imports relativos. Isso impede que
 * os módulos de endpoint (carregados dinamicamente de fora deste pacote) importem
 * arquivos locais sem escrever a extensão (ex: `from "./utils/foo"` em vez de `"./utils/foo.ts"`).
 *
 * Este hook intercepta apenas falhas de resolução (ERR_MODULE_NOT_FOUND /
 * ERR_UNSUPPORTED_DIR_IMPORT) de especificadores relativos/absolutos e tenta encontrar
 * o arquivo real testando extensões comuns e `index.*`, delegando o restante ao
 * comportamento padrão do Node.
 */
const resolverHookSource = `
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const code = error && error.code;
    if (code !== 'ERR_MODULE_NOT_FOUND' && code !== 'ERR_UNSUPPORTED_DIR_IMPORT') {
      throw error;
    }

    const isPathSpecifier =
      specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('file:');

    if (!isPathSpecifier || !context.parentURL) {
      throw error;
    }

    const basePath = specifier.startsWith('file:')
      ? fileURLToPath(specifier)
      : path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);

    for (const ext of EXTENSIONS) {
      const candidate = basePath + ext;
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }

    if (existsSync(basePath) && statSync(basePath).isDirectory()) {
      for (const ext of EXTENSIONS) {
        const candidate = path.join(basePath, \`index\${ext}\`);
        if (existsSync(candidate) && statSync(candidate).isFile()) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }

    throw error;
  }
}
`;

let registered = false;

export function registerEndpointModuleResolver() {
  if (registered) {
    return;
  }
  registered = true;

  const dataUrl = `data:text/javascript,${encodeURIComponent(resolverHookSource)}`;
  register(dataUrl, import.meta.url);
}

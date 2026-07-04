import fs from 'fs';
import path from 'path';

const workDir = process.env.API_FAKE_WORKDIR ?? process.cwd();
const configFile = path.join(workDir, 'api-fake.config.json');

const defaultConfig = {
  APP_PORT: 3343,
  API_PORT: 3342,
  SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API: '/api',
  WORKSPACES_ROOT_PATH: 'src',
  ACTIVE_WORKSPACE: 'grupo-endpoints',
  PROXY_CONFIG_FILE: '',
  PROXY_CONFIG_FILE_ADDRESS_KEY: '',
  BROWSER: '',
  BROWSER_ARGS: '',
};

type Configs = typeof defaultConfig;

type ConfigKey = keyof Configs;

const config: Configs = { ...defaultConfig };

export function getConfig() {
  return config;
}

function isValidConfigKey(key: string | undefined): key is ConfigKey {
  if (!key) return false;
  return key in defaultConfig;
}

type ConfigKeyWithPath = Extract<ConfigKey, 'WORKSPACES_ROOT_PATH' | 'PROXY_CONFIG_FILE'>;
type ConfigPaths = Pick<Configs, (typeof pathKeys)[number]>;
const pathKeys: ConfigKeyWithPath[] = ['WORKSPACES_ROOT_PATH', 'PROXY_CONFIG_FILE'];

function resolvePaths(cfg: Configs): Configs {
  const resolved = { ...cfg } as ConfigPaths;
  for (const key of pathKeys) {
    if (resolved[key]) {
      resolved[key] = path.resolve(workDir, resolved[key]);
    }
  }
  return resolved as Configs;
}

function syncConfigFile() {
  let fileConfig: Partial<typeof defaultConfig> = {};

  if (fs.existsSync(configFile)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    } catch {
      console.warn('Erro ao ler api-fake.config.json, usando valores padrão.');
    }
  }

  const keys = Object.keys(defaultConfig) as ConfigKey[];
  const hasMissingKeys = keys.some((key) => !(key in fileConfig));

  const merged = { ...defaultConfig, ...fileConfig } as typeof defaultConfig;
  const arquivoExiste = fs.existsSync(configFile);

  if (hasMissingKeys) {
    fs.writeFileSync(configFile, JSON.stringify(merged, null, 2));
    if (!arquivoExiste) {
      console.log(`Arquivo api-fake.config.json criado em: ${configFile}`);
    } else {
      console.log(`Arquivo api-fake.config.json atualizado em: ${configFile}`);
    }
  }

  const resolved = resolvePaths(merged);
  Object.assign(config, resolved);
}

class ConfigValidationError {
  static readonly colors = {
    red: '\u001b[31m',
    green: '\u001b[32m',
    reset: '\u001b[0m',
  };

  static highlight(text: string): string {
    return `${ConfigValidationError.colors.green}${text}${ConfigValidationError.colors.red}`;
  }

  constructor(
    private readonly _args: {
      help: string;
      key: ConfigKey;
    },
  ) {}

  exit(message: string) {
    const { red, reset } = ConfigValidationError.colors;
    const { help, key } = this._args;

    const msg = [
      `\nVerifique o arquivo api-fake.config.json em: ${configFile}\n`,
      `A chave "${key}" não é válida.`,
      `${key}: "${config[key]}"`,
      ``,
      ...(message ? [message, ''] : []),
      ...(help ? [help] : []),
    ].join('\n');

    console.error(`${red}${msg}${reset}`);

    process.exit(1);
  }
}

type ConfigValidators = Record<ConfigKey, () => { fail: (message: string) => void }>;

function noopValidator() {
  return { fail: () => {} };
}

function portValidator() {
  const port = config.APP_PORT;
  if (typeof port !== 'number' || port <= 0 || port > 65535) {
    const help = ['APP_PORT deve ser um número inteiro entre 1 e 65535.'].join('\n');
    const error = new ConfigValidationError({ help, key: 'APP_PORT' });
    error.exit('');
  }
  return noopValidator();
}

export const configValidators: ConfigValidators = {
  APP_PORT: portValidator,
  API_PORT: portValidator,
  SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API: noopValidator,
  WORKSPACES_ROOT_PATH: () => {
    const help = [
      'WORKSPACES_ROOT_PATH deve conter o caminho para a pasta raiz dos workspaces de endpoints.',
      '',
      'Exemplo:',
      '',
      `  "WORKSPACES_ROOT_PATH": ${ConfigValidationError.highlight('"root-endpoints"')}`,
      '',
    ].join('\n');

    const error = new ConfigValidationError({ help, key: 'WORKSPACES_ROOT_PATH' });

    if (!config.WORKSPACES_ROOT_PATH) {
      error.exit('');
    }

    const resolvedPath = config.WORKSPACES_ROOT_PATH; // já resolvido em syncConfigFile
    fs.mkdirSync(resolvedPath, { recursive: true });

    return noopValidator();
  },
  ACTIVE_WORKSPACE: () => {
    const rootPath = config.WORKSPACES_ROOT_PATH; // já resolvido em syncConfigFile

    const help = [
      'ACTIVE_WORKSPACE deve conter o nome da pasta com os endpoints.',
      '',
      `Essa pasta precisa existir dentro do diretório "${rootPath}".`,
      '',
      'Exemplo:',
      '',
      `  "ACTIVE_WORKSPACE": ${ConfigValidationError.highlight('"my-endpoints"')}`,
      '',
      'Deverá existir um caminho:',
      '',
      `  ${rootPath}/${ConfigValidationError.highlight('my-endpoints')}`,
      '',
    ].join('\n');

    const error = new ConfigValidationError({ help, key: 'ACTIVE_WORKSPACE' });

    if (!config.ACTIVE_WORKSPACE) {
      error.exit('');
    }

    const resolvedPath = path.resolve(rootPath, config.ACTIVE_WORKSPACE);
    fs.mkdirSync(resolvedPath, { recursive: true });

    return noopValidator();
  },
  PROXY_CONFIG_FILE: () => {
    const help = [
      'PROXY_CONFIG_FILE deve fornecer o caminho para o arquivo de configuração do proxy.',
      '',
      'O arquivo precisa existir e conter um JSON válido.',
      '',
      'Exemplo:',
      '',
      `  "PROXY_CONFIG_FILE": ${ConfigValidationError.highlight('"./proxy-config.json"')}`,
      '',
    ].join('\n');

    const error = new ConfigValidationError({ help, key: 'PROXY_CONFIG_FILE' });

    if (!config.PROXY_CONFIG_FILE) {
      error.exit('');
    }

    const resolvedProxyFile = config.PROXY_CONFIG_FILE; // já resolvido em syncConfigFile

    if (!fs.existsSync(resolvedProxyFile)) {
      error.exit('Arquivo de configuração do proxy não encontrado.');
    }

    try {
      const fileContent = fs.readFileSync(resolvedProxyFile, 'utf-8');
      JSON.parse(fileContent);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      error.exit('Arquivo de configuração do proxy não contém um JSON válido.');
    }

    return noopValidator();
  },
  PROXY_CONFIG_FILE_ADDRESS_KEY: () => {
    const exampleConfig = { key: { key1: { itens: { item1: 'valor1' } } } };
    const help = [
      'PROXY_CONFIG_FILE_ADDRESS_KEY deve fornecer o caminho de chaves para o objeto de configuração do proxy.',
      '',
      'As chaves devem ser separadas por vírgula, formando o caminho até o objeto desejado.',
      '',
      'Exemplo:',
      'Se o conteúdo do arquivo apontado por PROXY_CONFIG_FILE for:',
      '',
      JSON.stringify(exampleConfig, null, 2),
      '',
      `e o objeto desejado for ${ConfigValidationError.highlight('{ item1: "valor1" }')}, defina:`,
      '',
      `  "PROXY_CONFIG_FILE_ADDRESS_KEY": ${ConfigValidationError.highlight('"key,key1,itens"')}`,
      '',
    ].join('\n');

    const error = new ConfigValidationError({ help, key: 'PROXY_CONFIG_FILE_ADDRESS_KEY' });

    if (!config.PROXY_CONFIG_FILE_ADDRESS_KEY) {
      error.exit('');
    }

    const resolvedProxyFile = config.PROXY_CONFIG_FILE; // já resolvido em syncConfigFile
    const proxyConfigFileContent = fs.readFileSync(resolvedProxyFile, 'utf-8');
    const proxyConfig = JSON.parse(proxyConfigFileContent);
    const addressKeys = config.PROXY_CONFIG_FILE_ADDRESS_KEY.split(',');

    const objectConfig = addressKeys.reduce((obj, key) => {
      if (obj && key in obj && typeof obj === 'object') {
        return obj[key];
      } else {
        return undefined;
      }
    }, proxyConfig);

    if (!objectConfig) {
      const message = [
        `Chave de endereço '${config.PROXY_CONFIG_FILE_ADDRESS_KEY}' não encontrada no arquivo de configuração do proxy.`,
        'Objeto de configuração atual:',
        JSON.stringify(proxyConfig, null, 2),
      ].join('\n');
      error.exit(message);
    }

    return {
      fail: (message) => error.exit(message),
    };
  },
  BROWSER: noopValidator,
  BROWSER_ARGS: noopValidator,
};

function validateConfig() {
  Object.keys(configValidators).forEach((key) => {
    if (isValidConfigKey(key)) {
      configValidators[key]();
    }
  });
}

export function loadConfig() {
  syncConfigFile();
  validateConfig();
}

loadConfig();

import 'dotenv/config';

import fs from 'fs';

const environmentVariables = {
  CLIENT_APP_PORT: '3343',
  CLIENT_API_PORT: '3342',
  SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API: '/api',
  WORKSPACE_ENDPOINTS_DIRECTORY: '',
  PROXY_CONFIG_FILE: '',
  PROXY_CONFIG_FILE_ADDRESS_KEY: '',
  BROWSER: '',
  BROWSER_ARGS: '',
};

export function getEnvironmentVariables() {
  return environmentVariables;
}

const dotEnvFile = '.env';

function isValidEnvKey(key: string | undefined): key is keyof typeof environmentVariables {
  if (!key) return false;
  return key in environmentVariables;
}

function syncEnvFile() {
  const keys = Object.keys(environmentVariables) as (keyof typeof environmentVariables)[];

  let variaveisNaoEncontradas = false;

  for (const key of keys) {
    const env = process.env[key];

    if (env === undefined) {
      variaveisNaoEncontradas = true;
    }

    environmentVariables[key] = env || environmentVariables[key];
  }

  if (variaveisNaoEncontradas) {
    const listKeys = Object.keys(environmentVariables)
      .map((key) => {
        if (!isValidEnvKey(key)) return '';
        return `${key}=${environmentVariables[key]}`;
      })
      .join('\n');

    const arquivoExiste = fs.existsSync(dotEnvFile);

    fs.writeFileSync(dotEnvFile, listKeys);

    if (!arquivoExiste) {
      console.log('Arquivo .env criado com sucesso.');
    } else {
      console.log('Arquivo .env atualizado com sucesso.');
    }

    return;
  }
}

class ValidationError {
  static readonly colors = {
    red: '\u001b[31m',
    green: '\u001b[32m',
    reset: '\u001b[0m',
  };

  static highlight(text: string): string {
    return `${ValidationError.colors.green}${text}${ValidationError.colors.red}`;
  }

  constructor(
    private readonly _args: {
      help: string;
      key: keyof typeof environmentVariables;
    },
  ) {}

  exit(message: string) {
    const { red, reset } = ValidationError.colors;
    const { help, key } = this._args;

    const msg = [
      `\nVerifique o arquivo .env ou as variáveis de ambiente do sistema operacional.\n`,
      `A variável ${key} não é válida.`,
      `${key}='${environmentVariables[key]}'`,
      ``,
      ...(message ? [message, ''] : []),
      ...(help ? [help] : []),
    ].join('\n');

    console.error(`${red}${msg}${reset}`);

    process.exit(1);
  }
}

type ObjectValidate = Record<
  keyof typeof environmentVariables,
  () => { fail: (message: string) => void }
>;

function noopValidator() {
  return { fail: () => {} };
}

export const envValidators: ObjectValidate = {
  CLIENT_APP_PORT: noopValidator,
  CLIENT_API_PORT: noopValidator,
  SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API: noopValidator,
  WORKSPACE_ENDPOINTS_DIRECTORY: () => {
    const help = [
      'WORKSPACE_ENDPOINTS_DIRECTORY deve conter o nome da pasta com os endpoints.',
      '',
      'Essa pasta precisa existir dentro do diretório "root-endpoints", que fica na',
      'raiz do projeto.',
      '',
      'Exemplo:',
      'Se o valor da variável WORKSPACE_ENDPOINTS_DIRECTORY for:',
      '',
      `  WORKSPACE_ENDPOINTS_DIRECTORY=${ValidationError.highlight('my-endpoints')}`,
      '',
      'Deverá existir um caminho:',
      '',
      `  ./root-endpoints/${ValidationError.highlight('my-endpoints')}`,
      '',
    ].join('\n');

    const error = new ValidationError({ help, key: 'WORKSPACE_ENDPOINTS_DIRECTORY' });

    if (!environmentVariables.WORKSPACE_ENDPOINTS_DIRECTORY) {
      error.exit('');
    }

    fs.mkdirSync('root-endpoints', { recursive: true });

    if (!fs.existsSync(`root-endpoints/${environmentVariables.WORKSPACE_ENDPOINTS_DIRECTORY}`)) {
      const message = 'Diretório de trabalho dos endpoints não encontrado.';
      error.exit(message);
    }

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
      `  PROXY_CONFIG_FILE=${ValidationError.highlight('./proxy-config.json')}`,
      '',
    ].join('\n');

    const error = new ValidationError({ help, key: 'PROXY_CONFIG_FILE' });

    if (!environmentVariables.PROXY_CONFIG_FILE) {
      error.exit('');
    }

    if (!fs.existsSync(environmentVariables.PROXY_CONFIG_FILE)) {
      const message = 'Arquivo de configuração do proxy não encontrado.';
      error.exit(message);
    }

    // checar se o arquivo é um JSON válido
    try {
      const fileContent = fs.readFileSync(environmentVariables.PROXY_CONFIG_FILE, 'utf-8');
      JSON.parse(fileContent);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      const message = 'Arquivo de configuração do proxy não contém um JSON válido.';
      error.exit(message);
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
      `e o objeto desejado for ${ValidationError.highlight('{ item1: "valor1" }')}, defina:`,
      '',
      `  PROXY_CONFIG_FILE_ADDRESS_KEY=${ValidationError.highlight('key,key1,itens')}`,
      '',
    ].join('\n');

    const error = new ValidationError({ help, key: 'PROXY_CONFIG_FILE_ADDRESS_KEY' });

    if (!environmentVariables.PROXY_CONFIG_FILE_ADDRESS_KEY) {
      error.exit('');
    }

    const proxyConfigFileContent = fs.readFileSync(environmentVariables.PROXY_CONFIG_FILE, 'utf-8');
    const proxyConfig = JSON.parse(proxyConfigFileContent);
    const addressKeys = environmentVariables.PROXY_CONFIG_FILE_ADDRESS_KEY.split(',');

    const objectConfig = addressKeys.reduce((obj, key) => {
      if (obj && key in obj && typeof obj === 'object') {
        return obj[key];
      } else {
        return undefined;
      }
    }, proxyConfig);

    if (!objectConfig) {
      const message = [
        `Chave de endereço '${environmentVariables.PROXY_CONFIG_FILE_ADDRESS_KEY}' não encontrada no arquivo de configuração do proxy.`,
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

function validateEnv() {
  Object.keys(envValidators).forEach((key) => {
    if (isValidEnvKey(key)) {
      envValidators[key]();
    }
  });
}

export function loadEnv() {
  syncEnvFile();
  validateEnv();
}

loadEnv();

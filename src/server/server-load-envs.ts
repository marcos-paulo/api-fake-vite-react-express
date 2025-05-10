import fs from "fs";
import "dotenv/config";

// import { config } from "dotenv";
// import path from "path";

// const __dirname = path.resolve();
// const pathEnv = path.resolve(__dirname, "./myEndpoints/.env");

// config({ path: pathEnv });

const environmentVariables = {
  CLIENT_APP_PORT: "3343",
  CLIENT_API_PORT: "3342",
  SERVER_DYNAMIC_ENDPOINTS_PORT: "3341",
  SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API: "/api",
  WORKSPACE_ENDPOINTS_DIRECTORY: "my-endpoints",
  PROXY_CONFIG_FILE: "",
  PROXY_CONFIG_FILE_ADDRESS_KEY: "",
  BROWSER: "",
  BROWSER_ARGS: "",
};

export function getEnvironmentVariables() {
  return environmentVariables;
}

const dotEnvFile = ".env";

function isKeyOfEnvironmentVariables(
  key: string | undefined
): key is keyof typeof environmentVariables {
  if (!key) return false;
  const retorno = key in environmentVariables;
  return retorno;
}

function loadEnvironmentVariables() {
  const keys = Object.keys(
    environmentVariables
  ) as (keyof typeof environmentVariables)[];

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
        if (!isKeyOfEnvironmentVariables(key)) return "";
        return `${key}=${environmentVariables[key]}`;
      })
      .join("\n");

    fs.writeFileSync(dotEnvFile, listKeys);

    if (!fs.existsSync(dotEnvFile)) {
      console.log("Arquivo .env criado com sucesso.");
    } else {
      console.log("Arquivo .env atualizado com sucesso.");
    }

    return;
  }
}

class ValidationError {
  private readonly key?: keyof typeof environmentVariables;
  constructor(
    private args: {
      help: string;
    }
  ) {
    // capturar dinamicamente o nome da função que instanciou a classe
    const stack = new Error().stack;
    const k = stack?.match(/Object\.(.*?) \(/)?.[1];

    if (isKeyOfEnvironmentVariables(k)) {
      this.key = k;
    } else {
      console.error(
        `\u001b[31mErro ao capturar a chave do erro: ${k}\u001b[0m`,
        stack
      );
    }
  }

  throw(message: string) {
    const { help } = this.args;

    const msg = [
      `\nVerifique o arquivo .env ou as variáveis de ambiente do sistema operacional.\n`,
      `A variável ${this.key || "invalid_key"} não é válida.`,
      `Valor atual: '${
        this.key ? environmentVariables[this.key] : "invalid_key"
      }'`,
    ].join("\n");

    console.error(
      `\u001b[31m${msg}${message ? "\n" + message : ""}\n${help}\u001b[0m`
    );

    process.exit(1);
  }
}

type ObjectValidate = Record<
  keyof typeof environmentVariables,
  () => { fail: (message: string) => void }
>;

function defaultValidateReturn() {
  return { fail: () => {} };
}

export const environmentValidate: ObjectValidate = {
  CLIENT_APP_PORT: defaultValidateReturn,
  CLIENT_API_PORT: defaultValidateReturn,
  SERVER_DYNAMIC_ENDPOINTS_PORT: defaultValidateReturn,
  SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API: defaultValidateReturn,
  WORKSPACE_ENDPOINTS_DIRECTORY: () => {
    const help = [
      "Esta variável deve fornecer o nome do diretório de trabalho dos endpoints.",
      "O diretóriop deve estar dentro de um diretório chamado 'root-endpoints'.",
      "Exemplo:",
      "WORKSPACE_ENDPOINTS_DIRECTORY=my-endpoints",
      "o caminho relativo seria algo como:",
      "./root-endpoints/my-endpoints",
    ].join("\n");

    const error = new ValidationError({ help });

    if (!environmentVariables.WORKSPACE_ENDPOINTS_DIRECTORY) {
      error.throw("");
    }

    fs.mkdirSync("root-endpoints", { recursive: true });

    if (
      !fs.existsSync(
        `root-endpoints/${environmentVariables.WORKSPACE_ENDPOINTS_DIRECTORY}`
      )
    ) {
      const message = "Diretório de trabalho dos endpoints não encontrado.";
      error.throw(message);
    }

    return defaultValidateReturn();
  },
  PROXY_CONFIG_FILE: () => {
    const help = [
      "Esta variável deve fornecer o caminho do arquivo de configuração do proxy.",
      "Exemplo:",
      "PROXY_CONFIG_FILE=./proxy-config.json",
    ].join("\n");

    const error = new ValidationError({ help });

    if (!environmentVariables.PROXY_CONFIG_FILE) {
      error.throw("");
    }

    if (!fs.existsSync(environmentVariables.PROXY_CONFIG_FILE)) {
      const message = "Arquivo de configuração do proxy não encontrado.";
      error.throw(message);
    }

    return defaultValidateReturn();
  },
  PROXY_CONFIG_FILE_ADDRESS_KEY: () => {
    const help = [
      "Esta variável deve fornecer o endereço do objeto de configuração do proxy.",
      "Exemplo:",
      "Se o objeto de configuração definido no arquivo apontado pela variável PROXY_CONFIG_FILE for:",
      JSON.stringify(
        { key: { key1: { itens: { item1: "valor1" } } } },
        null,
        2
      ),
      'onde o valor que deve ser alcançado é { item1: "valor1" }, então a variável deve ser definida da seguinte forma:',
      "ADDRESS_KEY_PROXY_CONFIG_FILE=key,key1,itens",
    ].join("\n");

    const error = new ValidationError({ help });

    if (!environmentVariables.PROXY_CONFIG_FILE_ADDRESS_KEY) {
      error.throw("");
    }

    return {
      fail: (message) => error.throw(message),
    };
  },
  BROWSER: defaultValidateReturn,
  BROWSER_ARGS: defaultValidateReturn,
};

function validateEnvironmentVariables() {
  Object.keys(environmentValidate).forEach((key) => {
    if (isKeyOfEnvironmentVariables(key)) {
      environmentValidate[key]();
    }
  });
}

export function loadEnvVariables() {
  loadEnvironmentVariables();
  validateEnvironmentVariables();
}

loadEnvVariables();

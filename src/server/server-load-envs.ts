import e from "express";
import fs from "fs";

// export const variaveisDeAmbiente.ADDRESS = process.env.ADDRESS || "http://localhost";
// export const variaveisDeAmbiente.PORT = process.env.PORT || "3001";
// prettier-ignore
// export const variaveisDeAmbiente.ENDPOINT_DEFAULT_PREFIX = process.env.ENDPOINT_DEFAULT_PREFIX || "/api";
// export const variaveisDeAmbiente.PROXY_CONFIG_FILE = process.env.PROXY_CONFIG_FILE || "";
// prettier-ignore
// export const variaveisDeAmbiente.ADDRESS_KEY_PROXY_CONFIG_FILE = process.env.ADDRESS_KEY_PROXY_CONFIG_FILE || "";

// const stringVariaveis2 = [
//   "ADDRESS",
//   "PORT",
//   "ENDPOINT_DEFAULT_PREFIX",
//   "PROXY_CONFIG_FILE",
//   "ADDRESS_KEY_PROXY_CONFIG_FILE",
// ] as const;

// function c<T extends string>(listKeys: readonly T[]): { [key in T]: string } {
//   const obj: Partial<{ [key in T]: string }> = {};

//   for (const key of listKeys) {
//     obj[key] = process.env[key] || "";
//   }

//   return obj as { [key in T]: string };
// }

// const d = c(stringVariaveis2);

export const environmentVariables = {
  CLIENT_APP_PORT: "3343",
  CLIENT_API_PORT: "3342",
  SERVER_DYNAMIC_ENDPOINTS_PORT: "3341",
  SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API: "/api",
  PROXY_CONFIG_FILE: "",
  PROXY_CONFIG_FILE_ADDRESS_KEY: "",
  BROWSER: "",
  BRWSER_ARGS: "",
};

function loadEnvironmentVariables() {
  const keys = Object.keys(
    environmentVariables
  ) as (keyof typeof environmentVariables)[];

  const listaEnvsNaoEncontradas: string[] = [];

  for (const key of keys) {
    const env = process.env[key];

    if (env === undefined)
      listaEnvsNaoEncontradas.push(`${key}=${environmentVariables[key]}\n`);

    environmentVariables[key] = env || environmentVariables[key];
  }

  if (listaEnvsNaoEncontradas.length > 0 && !fs.existsSync(".env")) {
    const listKeys = keys
      .map((key) => `${key}=${environmentVariables[key]}`)
      .join("\n");
    fs.writeFileSync(".env", listKeys);
    console.log("Arquivo .env criado com sucesso.");
    return;
  }

  if (listaEnvsNaoEncontradas.length > 0) {
    const listEnvs = listaEnvsNaoEncontradas.join("");
    fs.appendFileSync(".env", listEnvs);
    console.log(
      "Variáveis não encontradas no arquivo .env foram adicionadas com sucesso."
    );
    return;
  }
}

function validateEnvironmentVariables() {
  if (!fs.existsSync(environmentVariables.PROXY_CONFIG_FILE)) {
    const mensagem = [
      "\x1b[31m",
      "Variável PROXY_CONFIG_FILE não encontrada.",
      "A variável de ambiente deve ser definida no sistema operacional, ou no arquivo .env presente na raiz do projeto.\x1b[0m",
    ];
    console.error(mensagem.join("\n"));
    process.exit(1);
  }

  if (!environmentVariables.PROXY_CONFIG_FILE_ADDRESS_KEY) {
    const mensagem = [
      "Variável ADDRESS_KEY_PROXY_CONFIG_FILE não encontrada.",
      "A variável de ambiente deve ser definida no sistema operacional, ou no arquivo .env presente na raiz do projeto.",
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

    console.error("\x1b[31m" + mensagem + "\x1b[0m");
    process.exit(1);
  }
}

export function loadEnvVariables() {
  loadEnvironmentVariables();
  validateEnvironmentVariables();
}

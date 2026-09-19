import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Publica a branch "pacote-compilado" (já criada por publish-package.ts, com
// o .tgz commitado sozinho nela) em cada projeto consumidor configurado —
// tanto local (push direto pro .git do consumidor, útil quando ele é uma
// pasta irmã neste disco) quanto pro GitHub (remote "origin" de cada um),
// pra quem clonar o consumidor numa outra máquina também conseguir buscar a
// branch.
//
// Caminho e nome de cada consumidor são específicos de máquina/ambiente —
// nada disso pertence ao histórico deste repo. Ficam em
// release-consumers.local.json, fora do git (.gitignore), recriado
// automaticamente com um template vazio sempre que não existir.
//
// Uso: npm run package:publish-consumers

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const consumersConfigPath = path.join(rootDir, 'release-consumers.local.json');

const PACKAGE_BRANCH = 'pacote-compilado';

type ConsumerEntry = {
  _example?: boolean;
  name: string;
  path: string;
};

type ConsumersConfig = {
  consumers: ConsumerEntry[];
};

const templateConfig: ConsumersConfig = {
  consumers: [
    {
      _example: true,
      name: 'nome-do-consumidor',
      path: '../caminho/para/o/projeto-consumidor',
    },
  ],
};

function getPackageName(): string {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')) as {
    name: string;
  };
  return packageJson.name;
}

// Recria o arquivo do zero sempre que ele não existir (ex.: primeira vez
// nesta máquina, ou depois de um clone novo) — entradas com "_example: true"
// são ignoradas, servem só de modelo pra preencher com os consumidores reais.
function loadConsumers(): ConsumerEntry[] {
  if (!fs.existsSync(consumersConfigPath)) {
    fs.writeFileSync(consumersConfigPath, `${JSON.stringify(templateConfig, null, 2)}\n`);
    console.log(
      `[publish-to-consumers] Criado ${path.basename(consumersConfigPath)} (fora do git) — preencha com os projetos consumidores reais e rode de novo.`,
    );
    return [];
  }

  const raw = JSON.parse(fs.readFileSync(consumersConfigPath, 'utf-8')) as ConsumersConfig;
  return (raw.consumers ?? []).filter((consumer) => !consumer._example);
}

function assertPackageBranchExists() {
  try {
    execFileSync('git', ['rev-parse', '--verify', PACKAGE_BRANCH], {
      cwd: rootDir,
      stdio: 'ignore',
    });
  } catch {
    console.error(
      `[publish-to-consumers] Branch "${PACKAGE_BRANCH}" não existe localmente. Rode "npm run package:publish" primeiro.`,
    );
    process.exit(1);
  }
}

function pushRef(destination: string, consumerBranch: string): boolean {
  try {
    execFileSync('git', ['push', destination, `${PACKAGE_BRANCH}:${consumerBranch}`, '--force'], {
      cwd: rootDir,
      stdio: 'inherit',
    });
    return true;
  } catch {
    console.error(`[publish-to-consumers] FALHOU ao enviar pra ${destination}.`);
    return false;
  }
}

function main() {
  const consumerBranch = `lib-externa/${getPackageName()}`;

  assertPackageBranchExists();

  const consumers = loadConsumers();

  if (consumers.length === 0) {
    console.log(
      `[publish-to-consumers] Nenhum consumidor configurado em ${path.basename(consumersConfigPath)} — nada a fazer.`,
    );
    return;
  }

  let failures = 0;

  for (const consumer of consumers) {
    const destinationPath = path.resolve(rootDir, consumer.path);

    if (!fs.existsSync(path.join(destinationPath, '.git'))) {
      console.error(
        `[publish-to-consumers] AVISO: "${consumer.name}" (${consumer.path}) não é um repo git (ou não existe) — pulando.`,
      );
      failures += 1;
      continue;
    }

    console.log(`[publish-to-consumers] Enviando (local) pra ${consumer.name}...`);
    if (!pushRef(destinationPath, consumerBranch)) failures += 1;

    let originUrl = '';
    try {
      originUrl = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: destinationPath })
        .toString()
        .trim();
    } catch {
      // sem remote "origin" configurado no consumidor
    }

    if (!originUrl) {
      console.error(
        `[publish-to-consumers] AVISO: "${consumer.name}" não tem remote "origin" — pulando push pro GitHub.`,
      );
      failures += 1;
      continue;
    }

    console.log(`[publish-to-consumers] Enviando (GitHub) pra ${originUrl}...`);
    if (!pushRef(originUrl, consumerBranch)) failures += 1;
  }

  if (failures > 0) {
    console.error('\n[publish-to-consumers] Terminado com avisos/falhas — ver acima.');
    process.exit(1);
  }

  console.log('\n[publish-to-consumers] Consumidores atualizados.');
}

main();

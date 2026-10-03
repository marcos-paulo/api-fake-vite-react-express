import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Builda o binário nativo (Rust/Tauri, ver native/api-fake-tauri/) dentro de um container
// Ubuntu 22.04 -- a distro mais antiga que já empacota webkit2gtk-4.1-dev, o que também define
// o piso de compatibilidade do binário (GLIBC_2.34; detalhes no Dockerfile.build). O resultado
// vai pra native-bin/, que é commitado: quem instala o pacote recebe o binário pronto, sem
// precisar de Docker/Rust/WebKitGTK pra compilar.

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const nativeDir = path.join(rootDir, 'native', 'api-fake-tauri');
const binaryName = 'api-fake-tauri';
const imageName = 'api-fake-tauri-build-u2204';

function findContainerEngine(): string {
  for (const engine of ['docker', 'podman']) {
    try {
      execFileSync('which', [engine], { stdio: 'ignore' });
      return engine;
    } catch {
      // tenta o próximo
    }
  }

  throw new Error('Precisa de docker ou podman instalado (nenhum encontrado no PATH).');
}

function main() {
  const engine = findContainerEngine();
  const cargoCacheDir = path.join(nativeDir, '.cargo-container-cache');

  console.log(`[build-native] Buildando imagem de build (${engine})...`);
  execFileSync(engine, ['build', '-t', imageName, '-f', 'Dockerfile.build', '.'], {
    cwd: nativeDir,
    stdio: 'inherit',
  });

  fs.mkdirSync(cargoCacheDir, { recursive: true });

  console.log(`[build-native] Compilando ${binaryName} em release dentro do container...`);
  // --user: sem isso o container roda como root e os arquivos gerados em target/ ficam donos
  // de root no host. CARGO_HOME aponta pra um cache gravável montado do host (o da imagem não
  // é gravável por um UID arbitrário); HOME=/tmp porque o UID do host não existe no
  // /etc/passwd da imagem.
  execFileSync(
    engine,
    [
      'run',
      '--rm',
      '--user',
      `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`,
      '-v',
      `${nativeDir}:/work`,
      '-v',
      `${cargoCacheDir}:/cargo-cache`,
      '-e',
      'HOME=/tmp',
      '-e',
      'RUSTUP_HOME=/usr/local/rustup',
      '-e',
      'CARGO_HOME=/cargo-cache',
      imageName,
      'bash',
      '-c',
      'cd /work && cargo build --release',
    ],
    { stdio: 'inherit' },
  );

  const outDir = path.join(rootDir, 'native-bin');
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(
    path.join(nativeDir, 'target', 'release', binaryName),
    path.join(outDir, binaryName),
  );
  fs.chmodSync(path.join(outDir, binaryName), 0o755);

  console.log(`[build-native] Binário copiado pra native-bin/${binaryName}`);
}

main();

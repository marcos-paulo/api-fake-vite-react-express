import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Token que autoriza as ações de humano no painel (ligar endpoint, trocar handler livremente,
 * aprovar/revogar handlers para agente...). Fica FORA do projeto consumidor, na pasta de
 * configuração do usuário, com permissão 0600: o agente de IA trabalha dentro do projeto e as
 * permissões dele devem negar leitura dessa pasta. Não é um segredo contra quem já roda código
 * como o mesmo usuário — só tira "um curl numa rota documentada" do caminho do agente.
 *
 * Nunca logar o valor do token (o backend do TUI grava stdout em arquivo dentro do projeto).
 */
export function getPanelTokenFilePath(): string {
  if (process.env.API_FAKE_TOKEN_FILE) return process.env.API_FAKE_TOKEN_FILE;

  const configHome = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config');
  return path.join(configHome, 'api-fake', 'panel-token');
}

function readTokenIfPresent(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8').trim() || null;
  } catch {
    return null;
  }
}

export function readOrCreatePanelToken(): string {
  const filePath = getPanelTokenFilePath();

  const existing = readTokenIfPresent(filePath);
  if (existing) return existing;

  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });

  try {
    // 'wx': se outro processo (servidor, TUI) criou entre a leitura e agora, não sobrescreve
    fs.writeFileSync(filePath, `${crypto.randomBytes(24).toString('base64url')}\n`, {
      mode: 0o600,
      flag: 'wx',
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }

  const created = readTokenIfPresent(filePath);
  if (!created) throw new Error(`Não foi possível ler o token do painel em ${filePath}`);
  return created;
}

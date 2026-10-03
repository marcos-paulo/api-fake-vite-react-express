import crypto from 'crypto';
import fs from 'fs';

import type { EndpointHandlerFn } from '../../types/dynamic-endpoints.types';

/**
 * Erro com status HTTP, lançado pelas operações de controle de agente e traduzido
 * pelas rotas em resposta (403 = proibido pelo modelo de aprovação, 409 = estado atual
 * não permite, 404 = alvo inexistente).
 */
export class AgentControlError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type HandlerSource = { hash: string; source: string };

/**
 * O hash cobre o código do próprio handler (`fn.toString()`). Helpers importados de
 * outros arquivos NÃO entram: alterar um helper muda o comportamento sem invalidar a
 * aprovação. Limite conhecido e aceito (documentado no bloco do AGENTS.md gerado pelo init).
 */
export function readHandlerSource(handler: EndpointHandlerFn): HandlerSource {
  const source = handler.toString();
  return { hash: crypto.createHash('sha256').update(source).digest('hex'), source };
}

type ApprovalRecords = Record<string, Record<string, HandlerSource>>;

function readJsonObject<T>(filePath: string): Record<string, T> {
  try {
    if (!fs.existsSync(filePath)) return {};
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, T>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Lockfile de aprovações humanas: `fileName -> handlerKey -> { hash, source }`.
 * Fica em `.config/api-fake/<workspace>/`, fora de `endpoints/`, pra o agente poder
 * editar os handlers sem poder se auto-aprovar (as permissões do consumidor devem
 * negar escrita nesse caminho). O `source` aprovado fica salvo pra o painel mostrar
 * o antes/depois quando o código mudar.
 */
export class AgentApprovalStore {
  private records: ApprovalRecords;

  constructor(private readonly filePath: string) {
    this.records = readJsonObject<Record<string, HandlerSource>>(filePath);
  }

  get(fileName: string, handlerKey: string): HandlerSource | undefined {
    return this.records[fileName]?.[handlerKey];
  }

  isApproved(fileName: string, handlerKey: string, hash: string): boolean {
    return this.get(fileName, handlerKey)?.hash === hash;
  }

  approve(fileName: string, handlerKey: string, current: HandlerSource) {
    this.records[fileName] = { ...this.records[fileName], [handlerKey]: current };
    this.save();
  }

  revoke(fileName: string, handlerKey: string) {
    const fileRecords = this.records[fileName];
    if (!fileRecords || !(handlerKey in fileRecords)) return;
    delete fileRecords[handlerKey];
    if (Object.keys(fileRecords).length === 0) delete this.records[fileName];
    this.save();
  }

  private save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.records, null, 2));
  }
}

export type AgentSelection = { previousKey: string };

/**
 * Registra os endpoints cujo handler ativo foi escolhido por um agente, com a chave que
 * estava ativa antes (a "última escolha humana"). Presença = escolhido pelo agente.
 */
export class AgentSelectionStore {
  selections: Record<string, AgentSelection>;

  constructor(private readonly filePath: string) {
    this.selections = readJsonObject<AgentSelection>(filePath);
  }

  has(fileName: string) {
    return fileName in this.selections;
  }

  set(fileName: string, previousKey: string) {
    // Já escolhido pelo agente: mantém o previousKey original (o último humano).
    this.selections[fileName] ??= { previousKey };
  }

  clear(fileName: string) {
    delete this.selections[fileName];
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.selections, null, 2));
  }
}

/** Formato `{ error, status }` que o global-error-handler espera. */
export function toHttpError(error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  return { error: err, status: error instanceof AgentControlError ? error.status : 400 };
}

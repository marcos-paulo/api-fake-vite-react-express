#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// CLI do agente de IA. Fala só com /api/agent/* e sempre se identifica como agente:
// o servidor é quem aplica o modelo de aprovação (flag no handler + aprovação humana).
// Não importa shared/config.ts de propósito: aquele módulo cria arquivos e chama
// process.exit ao carregar, e o agente não deve ter esse efeito colateral.

const ACTOR_HEADER = 'x-api-fake-actor';
const DEFAULT_API_PORT = 3342;

type AgentHandler = {
  name: string;
  state: 'approved' | 'pending' | 'blocked';
  description?: string;
};

type AgentControl = {
  name: string;
  type: string;
  label: string;
  value: boolean | number | string;
  default: boolean | number | string;
  changeable: boolean;
  blockedReason?: string;
  min?: number;
  max?: number;
  options?: string[];
  maxLength?: number;
  pattern?: string;
};

type AgentEndpoint = {
  endpoint: string;
  serverAddress: string;
  method: string;
  enabled: boolean;
  loadError: boolean;
  activeHandler: string;
  activeHandlerByAgent: boolean;
  handlers: AgentHandler[];
  controls: AgentControl[];
};

const STATE_LABEL: Record<AgentHandler['state'], string> = {
  approved: 'aprovado',
  pending: 'pendente (aguarda aprovação humana)',
  blocked: 'bloqueado (só humano ativa)',
};

const HELP = `api-fake-agent — alterna o handler ativo de endpoints do api-fake.

Uso:
  api-fake-agent list [--json]                 Lista endpoints e handlers (com o estado de cada um)
  api-fake-agent status <endpoint> [--json]    Handler ativo de um endpoint
  api-fake-agent set <endpoint> <handler>      Troca o handler ativo (só handlers "aprovado")
  api-fake-agent set-control <endpoint> <controle> <valor>
                                               Muda o valor de um controle (só os "alteráveis")

<endpoint> é o fileName (ex: users.ts) ou o serverAddress, se for único.

Regras:
  - Só handlers "aprovado" podem ser ativados. "pendente" e "bloqueado" exigem um humano.
  - Ligar/desligar endpoint e aprovar handlers é sempre decisão humana, pelo painel.
  - Controle só é alterável se o autor declarou agent: true. Controle de texto exige também
    maxLength e pattern. Sem isso, só um humano altera, pelo painel.
  - O valor precisa respeitar as regras do controle (limites, opções, padrão). Veja em "list".
  - Código novo ou alterado volta a "pendente" até um humano aprovar de novo.

Saída de erro: código 1 = recusado ou erro; 2 = api-fake não está acessível.`;

function readApiPort(): number {
  const workDir = process.env.API_FAKE_WORKDIR ?? process.cwd();
  const configFile = path.join(workDir, '.config', 'api-fake', 'api-fake.config.json');

  try {
    const parsed = JSON.parse(fs.readFileSync(configFile, 'utf-8')) as { API_PORT?: unknown };
    return typeof parsed.API_PORT === 'number' ? parsed.API_PORT : DEFAULT_API_PORT;
  } catch {
    return DEFAULT_API_PORT;
  }
}

class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode: number,
  ) {
    super(message);
  }
}

async function callApi<T>(method: 'GET' | 'POST', route: string, body?: unknown): Promise<T> {
  const url = `http://localhost:${readApiPort()}${route}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json', [ACTOR_HEADER]: 'agent' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new CliError(
      `api-fake não está acessível em ${url}. Peça a um humano para iniciá-lo (não suba o servidor por conta própria).`,
      2,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;

  if (!response.ok) {
    throw new CliError(payload.error ?? `Falha HTTP ${response.status}`, 1);
  }

  return payload;
}

function findEndpoint(endpoints: AgentEndpoint[], target: string): AgentEndpoint {
  const byFile = endpoints.filter((item) => item.endpoint === target);
  const matches = byFile.length > 0 ? byFile : endpoints.filter((i) => i.serverAddress === target);

  if (matches.length === 0) {
    throw new CliError(`Endpoint não encontrado: ${target}. Use "list" para ver os existentes.`, 1);
  }
  if (matches.length > 1) {
    throw new CliError(
      `"${target}" é ambíguo (${matches.map((m) => m.endpoint).join(', ')}). Use o fileName.`,
      1,
    );
  }

  return matches[0];
}

function formatConstraints(control: AgentControl): string {
  const parts = [
    control.min !== undefined ? `min ${control.min}` : null,
    control.max !== undefined ? `max ${control.max}` : null,
    control.options ? `opções: ${control.options.join(' | ')}` : null,
    control.maxLength !== undefined ? `até ${control.maxLength} caracteres` : null,
    control.pattern !== undefined ? `padrão ${control.pattern}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? ` [${parts.join('; ')}]` : '';
}

function formatControl(control: AgentControl): string {
  const state = control.changeable
    ? `alterável${formatConstraints(control)}`
    : `bloqueado (${control.blockedReason ?? 'só humano altera'})`;

  return `    ${control.name} (${control.type}) = ${JSON.stringify(control.value)}, padrão ${JSON.stringify(control.default)} — ${control.label}: ${state}`;
}

function formatEndpoint(item: AgentEndpoint): string {
  const header = `${item.endpoint}  (${item.method.toUpperCase()} ${item.serverAddress})`;
  const power = item.enabled ? 'ligado' : 'DESLIGADO (só humano liga)';
  const active = item.activeHandlerByAgent
    ? `${item.activeHandler} (escolhido por agente)`
    : item.activeHandler;

  const handlers = item.handlers.map((handler) => {
    const mark = handler.name === item.activeHandler ? '*' : ' ';
    const description = handler.description ? ` — ${handler.description}` : '';
    return `  ${mark} ${handler.name}: ${STATE_LABEL[handler.state]}${description}`;
  });

  const controls =
    item.controls.length > 0 ? ['  controles:', ...item.controls.map(formatControl)] : [];

  return [header, `  ${power}; handler ativo: ${active}`, ...handlers, ...controls].join('\n');
}

function printResult(endpoints: AgentEndpoint[], asJson: boolean) {
  console.log(
    asJson ? JSON.stringify(endpoints, null, 2) : endpoints.map(formatEndpoint).join('\n\n'),
  );
}

async function run(args: string[]) {
  const asJson = args.includes('--json');
  const [command, ...rest] = args.filter((arg) => arg !== '--json');

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    console.log(HELP);
    return;
  }

  if (command === 'list') {
    const endpoints = await callApi<AgentEndpoint[]>('GET', '/api/agent/endpoints');
    printResult(endpoints, asJson);
    return;
  }

  if (command === 'status') {
    if (!rest[0]) throw new CliError('Uso: api-fake-agent status <endpoint>', 1);
    const endpoints = await callApi<AgentEndpoint[]>('GET', '/api/agent/endpoints');
    printResult([findEndpoint(endpoints, rest[0])], asJson);
    return;
  }

  if (command === 'set') {
    if (!rest[0] || !rest[1]) throw new CliError('Uso: api-fake-agent set <endpoint> <handler>', 1);
    await callApi('POST', '/api/agent/set-handler', { endpoint: rest[0], handler: rest[1] });
    console.log(
      asJson
        ? JSON.stringify({ ok: true, endpoint: rest[0], handler: rest[1] })
        : `ok: ${rest[0]} agora usa o handler "${rest[1]}"`,
    );
    return;
  }

  if (command === 'set-control') {
    const [target, key, value] = rest;
    if (!target || !key || value === undefined) {
      throw new CliError('Uso: api-fake-agent set-control <endpoint> <controle> <valor>', 1);
    }
    await callApi('POST', '/api/agent/set-control', { endpoint: target, key, value });
    console.log(
      asJson
        ? JSON.stringify({ ok: true, endpoint: target, key, value })
        : `ok: ${target} → ${key} = ${value}`,
    );
    return;
  }

  throw new CliError(`Comando desconhecido: ${command}\n\n${HELP}`, 1);
}

run(process.argv.slice(2)).catch((error: unknown) => {
  if (error instanceof CliError) {
    console.error(`erro: ${error.message}`);
    process.exit(error.exitCode);
  }
  console.error('erro inesperado:', error);
  process.exit(1);
});

import type { Request, Response } from 'express';

export type EndpointMethod = 'get' | 'post' | 'put' | 'delete';

/** Valor que um controle pode ter. */
export type ControlValue = boolean | number | string;

/** Valores atuais dos controles do handler ativo (`chave -> valor`), lidos a cada request. */
export type ControlValues = Record<string, ControlValue>;

/**
 * Terceiro parâmetro do handler. Somente leitura: o painel é quem altera os valores.
 * Handlers antigos, com 2 parâmetros, continuam funcionando.
 */
export type EndpointContext = { controls: ControlValues };

export type EndpointHandlerFn = (req: Request, res: Response, ctx: EndpointContext) => void;

/**
 * Declaração do autor do handler: "pode ser elegível a ser ativado por um agente de IA".
 * Omitido equivale a 'denied'. Sozinho não libera nada — o agente só ativa o handler
 * depois que um humano o aprova no painel (ver `AgentHandlerState`).
 */
export type AgentControl = 'allowed' | 'denied';

type ControlBase = {
  /** Rótulo mostrado no painel. */
  label: string;
  /** Ajuda curta mostrada junto do controle. Opcional. */
  description?: string;
  /**
   * Libera este controle para o agente de IA (`api-fake-agent`). Padrão: `false`.
   * O painel (humano) sempre pode alterar. O agente só pode se `agent: true`.
   * Em controle `text`, `agent: true` sozinho NÃO basta — veja `TextControl`.
   */
  agent?: boolean;
};

export type SwitchControl = ControlBase & { type: 'switch'; default: boolean };

export type NumberControl = ControlBase & {
  type: 'number';
  default: number;
  min?: number;
  max?: number;
  step?: number;
};

export type SliderControl = ControlBase & {
  type: 'slider';
  default: number;
  min: number;
  max: number;
  step?: number;
};

export type SelectControl = ControlBase & {
  type: 'select';
  default: string;
  options: { value: string; label: string }[];
};

/**
 * Texto livre. É o único tipo que o handler pode usar de forma perigosa
 * (ler arquivo, montar RegExp, devolver HTML), por isso tem regras extras.
 *
 * Como preencher:
 * - `maxLength`: tamanho máximo. Sem ele, vale o teto de 200 caracteres.
 * - `pattern`: texto (string) com uma expressão regular. O texto inteiro precisa casar.
 *   O servidor coloca `^...$` sozinho. Escolha um padrão apertado.
 *   Bom: `'^[a-zA-Z0-9 ]*$'` (só letras, números e espaço).
 *   Ruim: `'.*'` (aceita qualquer coisa, inclusive `../`).
 * - `default`: precisa passar em `maxLength` e `pattern`.
 *
 * Valem para painel e agente. Valor fora da regra é recusado (400).
 *
 * **Para o agente mexer neste controle, são obrigatórios os três juntos:**
 * `agent: true` + `maxLength` + `pattern`.
 * Faltou um deles? O controle continua funcionando no painel,
 * mas o agente NÃO consegue alterá-lo (o servidor recusa).
 *
 * @example
 * busca: {
 *   type: 'text',
 *   label: 'Nome contém',
 *   default: '',
 *   maxLength: 30,
 *   pattern: '^[a-zA-Z0-9 ]*$',
 *   agent: true,
 * }
 */
export type TextControl = ControlBase & {
  type: 'text';
  default: string;
  maxLength?: number;
  pattern?: string;
};

export type EndpointControl =
  SwitchControl | NumberControl | SliderControl | SelectControl | TextControl;

export type EndpointControlsMap = Record<string, EndpointControl>;

export type EndpointHandlerEntry = {
  description: string;
  handler: EndpointHandlerFn;
  agentControl?: AgentControl;
  /** Controles só deste handler. Somam-se aos do endpoint; a mesma chave aqui vence. */
  controls?: EndpointControlsMap;
};

export type EndpointHandlersMap = Record<string, EndpointHandlerEntry>;

type EndpointBase = {
  /** Nome curto (até ~60 caracteres) que diz o que o endpoint faz. Opcional; aparece como título do card. */
  title?: string;
  description: string;
  /** Endereço completo interceptado no proxy do host (ex: "/api/usuarios"). */
  serverAddress: string;
  /** Endereço completo servido pelo servidor fake local (ex: "/api/usuarios"). */
  localhostAddress: string;
  method: EndpointMethod;
  tags?: string[];
  /** Vale só para o formato legado (`handler` único), que vira o handler "default". */
  agentControl?: AgentControl;
  /**
   * Controles mostrados no card do painel (botões, switch, ...). O handler lê os valores
   * em `ctx.controls` (terceiro parâmetro). Valem para todos os handlers do endpoint.
   */
  controls?: EndpointControlsMap;
};

export type EndpointObject = EndpointBase &
  (
    | { handler: EndpointHandlerFn; handlers?: never } // legado: handler único
    | { handlers: EndpointHandlersMap; handler?: never } // handlers múltiplos nomeados
  );

export type LoadedModule = {
  endpoint: EndpointObject | null;
  fileName: string;
  loadError: boolean;
};

export function isEndpointObject(endpoint: unknown): endpoint is EndpointObject {
  if (!endpoint || typeof endpoint !== 'object') {
    return false;
  }

  return isEndpoint(endpoint as Partial<EndpointBase> & { handler?: unknown; handlers?: unknown });
}

function isEndpoint(
  endpoint: Partial<EndpointBase> & { handler?: unknown; handlers?: unknown },
): endpoint is EndpointObject {
  const hasValidTags =
    endpoint.tags === undefined ||
    (Array.isArray(endpoint.tags) && endpoint.tags.every((tag) => typeof tag === 'string'));

  return (
    typeof endpoint.serverAddress === 'string' &&
    typeof endpoint.localhostAddress === 'string' &&
    !!endpoint.method &&
    ['get', 'post', 'put', 'delete'].includes(endpoint.method) &&
    hasValidTags &&
    (endpoint.title === undefined || typeof endpoint.title === 'string') &&
    isValidAgentControl(endpoint.agentControl) &&
    isValidControlsMap(endpoint.controls) &&
    isValidHandlersShape(endpoint.handler, endpoint.handlers)
  );
}

function isValidAgentControl(agentControl: unknown): boolean {
  return agentControl === undefined || agentControl === 'allowed' || agentControl === 'denied';
}

function isValidHandlersShape(handler: unknown, handlers: unknown): boolean {
  const hasLegacyHandler = typeof handler === 'function';
  const hasHandlersMap = isValidHandlersMap(handlers);

  // exatamente um dos dois formatos deve estar presente
  return hasLegacyHandler !== hasHandlersMap;
}

function isValidHandlersMap(handlers: unknown): handlers is EndpointHandlersMap {
  if (!handlers || typeof handlers !== 'object') {
    return false;
  }

  const entries = Object.values(handlers as Record<string, unknown>);

  return (
    entries.length > 0 &&
    entries.every((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const { description, handler, agentControl, controls } =
        entry as Partial<EndpointHandlerEntry>;
      return (
        typeof description === 'string' &&
        typeof handler === 'function' &&
        isValidAgentControl(agentControl) &&
        isValidControlsMap(controls)
      );
    })
  );
}

/**
 * Normaliza os dois formatos aceitos de handler num único mapa — endpoints com
 * `handler` legado viram um mapa de uma entrada só, sob a chave "default".
 */
export function getEndpointHandlersMap(endpoint: EndpointObject): EndpointHandlersMap {
  // O "in" nativo não estreita bem essa união intersectada com EndpointBase — cast explícito.
  const raw = endpoint as EndpointBase & {
    handler?: EndpointHandlerFn;
    handlers?: EndpointHandlersMap;
  };

  if (raw.handlers) {
    return raw.handlers;
  }

  return {
    default: {
      description: raw.description,
      handler: raw.handler as EndpointHandlerFn,
      agentControl: raw.agentControl,
    },
  };
}

/** Teto de caracteres de um controle `text` sem `maxLength`. */
export const DEFAULT_TEXT_MAX_LENGTH = 200;

export type ControlValidation = { ok: true; value: ControlValue } | { ok: false; reason: string };

/** Compila o `pattern` de um controle `text`, ancorado: o texto inteiro precisa casar. */
function compileTextPattern(pattern: string): RegExp | null {
  try {
    return new RegExp(`^(?:${pattern})$`);
  } catch {
    return null;
  }
}

/**
 * Valida um valor contra o schema do controle. É a única fonte de verdade: o servidor usa
 * em toda alteração (painel e agente) e o painel usa para avisar antes de enviar.
 */
export function validateControlValue(control: EndpointControl, value: unknown): ControlValidation {
  switch (control.type) {
    case 'switch':
      return typeof value === 'boolean'
        ? { ok: true, value }
        : { ok: false, reason: 'esperado true ou false' };

    case 'number':
    case 'slider': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return { ok: false, reason: 'esperado um número' };
      }
      if (control.min !== undefined && value < control.min) {
        return { ok: false, reason: `mínimo é ${control.min}` };
      }
      if (control.max !== undefined && value > control.max) {
        return { ok: false, reason: `máximo é ${control.max}` };
      }
      return { ok: true, value };
    }

    case 'select': {
      const allowed = control.options.map((option) => option.value);
      return typeof value === 'string' && allowed.includes(value)
        ? { ok: true, value }
        : { ok: false, reason: `valores aceitos: ${allowed.join(', ')}` };
    }

    case 'text': {
      if (typeof value !== 'string') return { ok: false, reason: 'esperado um texto' };
      const maxLength = control.maxLength ?? DEFAULT_TEXT_MAX_LENGTH;
      if (value.length > maxLength) {
        return { ok: false, reason: `máximo de ${maxLength} caracteres` };
      }
      if (control.pattern !== undefined) {
        const regex = compileTextPattern(control.pattern);
        if (!regex || !regex.test(value)) {
          return { ok: false, reason: `o texto não segue o padrão ${control.pattern}` };
        }
      }
      return { ok: true, value };
    }
  }
}

/**
 * Converte o texto recebido pelo CLI do agente (`"true"`, `"42"`) para o tipo do controle.
 * Valor que não converte passa como veio e é recusado por `validateControlValue`.
 */
export function parseControlValue(control: EndpointControl, raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;

  if (control.type === 'switch') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  }

  if ((control.type === 'number' || control.type === 'slider') && raw.trim() !== '') {
    return Number(raw);
  }

  return raw;
}

/**
 * Motivo pelo qual o agente NÃO pode alterar o controle, ou `null` se pode.
 * Controle `text` exige `agent: true` + `maxLength` + `pattern` (ver `TextControl`).
 */
export function getAgentControlBlockReason(control: EndpointControl): string | null {
  if (control.agent !== true) {
    return 'o controle não declara agent: true';
  }

  if (control.type === 'text') {
    const missing = [
      control.maxLength === undefined ? 'maxLength' : null,
      control.pattern === undefined ? 'pattern' : null,
    ].filter(Boolean);

    if (missing.length > 0) {
      return `controle de texto sem ${missing.join(' e ')} (o agente só mexe com agent: true + maxLength + pattern)`;
    }
  }

  return null;
}

function isValidControl(control: unknown): control is EndpointControl {
  if (!control || typeof control !== 'object') return false;

  const candidate = control as Partial<Record<string, unknown>>;
  const { type, label, agent } = candidate;

  if (typeof label !== 'string' || (agent !== undefined && typeof agent !== 'boolean')) {
    return false;
  }

  const { min, max } = candidate as { min?: unknown; max?: unknown };
  const isOptionalNumber = (value: unknown) => value === undefined || typeof value === 'number';

  switch (type) {
    case 'switch':
      break;
    case 'number':
    case 'slider':
      if (!isOptionalNumber(min) || !isOptionalNumber(max) || !isOptionalNumber(candidate.step)) {
        return false;
      }
      if (type === 'slider' && (typeof min !== 'number' || typeof max !== 'number')) return false;
      if (typeof min === 'number' && typeof max === 'number' && min > max) return false;
      break;
    case 'select': {
      const { options } = candidate;
      if (
        !Array.isArray(options) ||
        options.length === 0 ||
        !options.every(
          (option: unknown) =>
            !!option &&
            typeof (option as { value?: unknown }).value === 'string' &&
            typeof (option as { label?: unknown }).label === 'string',
        )
      ) {
        return false;
      }
      break;
    }
    case 'text': {
      const { maxLength, pattern } = candidate;
      if (maxLength !== undefined && (!Number.isInteger(maxLength) || (maxLength as number) < 1)) {
        return false;
      }
      if (pattern !== undefined && (typeof pattern !== 'string' || !compileTextPattern(pattern))) {
        return false;
      }
      break;
    }
    default:
      return false;
  }

  // o default precisa passar nas próprias regras
  return validateControlValue(control as EndpointControl, candidate.default).ok;
}

function isValidControlsMap(controls: unknown): boolean {
  if (controls === undefined) return true;
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) return false;
  return Object.values(controls).every(isValidControl);
}

/**
 * Controles que valem para um handler: os do endpoint mais os do próprio handler
 * (a mesma chave no handler vence).
 */
export function getEffectiveControls(
  endpoint: EndpointObject,
  handlerKey: string,
): EndpointControlsMap {
  const handlerControls = getEndpointHandlersMap(endpoint)[handlerKey]?.controls;
  return { ...endpoint.controls, ...handlerControls };
}

export type ModuleEndpoint = { endpoint: EndpointObject };

export type EnabledEndpointRecord = {
  fileName: string;
};

import fs from 'fs';

import {
  type ControlValue,
  type ControlValues,
  type EndpointControlsMap,
  validateControlValue,
} from '../../types/dynamic-endpoints.types';

type StoredValues = Record<string, Record<string, ControlValue>>;

function readStoredValues(filePath: string): StoredValues {
  try {
    if (!fs.existsSync(filePath)) return {};
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as StoredValues)
      : {};
  } catch {
    return {};
  }
}

/**
 * Valores que o painel (ou o agente) escolheu para os controles: `fileName -> chave -> valor`.
 * Fica em `.config/api-fake/<workspace>/controlValues.json`, junto do resto do estado gerado.
 * O handler nunca escreve aqui: ele só recebe a foto dos valores em `ctx.controls`.
 */
export class ControlValuesStore {
  private values: StoredValues;

  constructor(private readonly filePath: string) {
    this.values = readStoredValues(filePath);
  }

  /** Valor salvo se ainda passa no schema; senão o `default` declarado no arquivo. */
  resolve(fileName: string, controls: EndpointControlsMap): ControlValues {
    const resolved: ControlValues = {};

    for (const [key, control] of Object.entries(controls)) {
      const stored = this.values[fileName]?.[key];
      const check = stored === undefined ? null : validateControlValue(control, stored);
      resolved[key] = check?.ok ? check.value : control.default;
    }

    return resolved;
  }

  set(fileName: string, key: string, value: ControlValue) {
    this.values[fileName] = { ...this.values[fileName], [key]: value };
  }

  /** Sem `key`, restaura todos os controles do arquivo. */
  reset(fileName: string, key?: string) {
    if (key === undefined) {
      delete this.values[fileName];
      return;
    }

    const fileValues = this.values[fileName];
    if (!fileValues) return;
    delete fileValues[key];
    if (Object.keys(fileValues).length === 0) delete this.values[fileName];
  }

  /** Remove valores de chaves que não existem mais em nenhum handler do arquivo. */
  prune(fileName: string, knownKeys: Set<string>) {
    const fileValues = this.values[fileName];
    if (!fileValues) return;

    for (const key of Object.keys(fileValues)) {
      if (!knownKeys.has(key)) delete fileValues[key];
    }
    if (Object.keys(fileValues).length === 0) delete this.values[fileName];
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.values, null, 2));
  }
}

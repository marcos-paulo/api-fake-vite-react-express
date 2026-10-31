import { useEffect, useId, useRef, useState } from 'react';

import {
  type ControlValue,
  type EndpointControl,
  validateControlValue,
} from '../../../../../types/dynamic-endpoints.types';
import type { ControlState, Endpoint } from '../../../../../types/endpoints.types';
import { Icon } from '../Icon';
import { Switch } from '../Switch';
import styles from './EndpointControls.module.css';

// Espera o usuário parar de mexer antes de enviar (slider e digitação disparam muitas mudanças)
const COMMIT_DELAY_MS = 250;

type EndpointControlsProps = {
  endpoint: Endpoint;
  /** Endpoint desligado ou tela ocupada: os controles aparecem, mas não aceitam mudança. */
  disabled: boolean;
  onChange: (fileName: string, key: string, value: ControlValue) => void;
  onReset: (fileName: string, key?: string) => void;
};

export const EndpointControls = ({
  endpoint,
  disabled,
  onChange,
  onReset,
}: EndpointControlsProps) => {
  const { controls } = endpoint;
  if (endpoint.loadError || controls.length === 0) return null;

  const changedCount = controls.filter((state) => !state.isDefault).length;

  return (
    <details className={styles.controls}>
      <summary className={styles.summary}>
        <Icon name="chevron" size={14} className={styles.chevron} />
        <span className={styles.title}>Ajustes</span>
        <span className={styles.count}>{controls.length}</span>
        {changedCount > 0 && (
          <span className={styles.modified} title="Há valores diferentes do padrão">
            {changedCount} alterado{changedCount > 1 ? 's' : ''}
          </span>
        )}
      </summary>

      <div className={styles.body}>
        {disabled && !endpoint.enabled && (
          <p className={styles.hint}>Habilite o endpoint para alterar os ajustes.</p>
        )}

        <ul className={styles.list}>
          {controls.map((state) => (
            <li key={state.key} className={styles.field}>
              <ControlField
                state={state}
                disabled={disabled}
                onCommit={(value) => onChange(endpoint.fileName, state.key, value)}
                onReset={() => onReset(endpoint.fileName, state.key)}
              />
            </li>
          ))}
        </ul>

        {changedCount > 0 && (
          <button
            type="button"
            className={styles.resetAll}
            disabled={disabled}
            onClick={() => onReset(endpoint.fileName)}
          >
            <Icon name="undo" size={12} /> Restaurar todos os padrões
          </button>
        )}
      </div>
    </details>
  );
};

type ControlFieldProps = {
  state: ControlState;
  disabled: boolean;
  onCommit: (value: ControlValue) => void;
  onReset: () => void;
};

const ControlField = ({ state, disabled, onCommit, onReset }: ControlFieldProps) => {
  const { control } = state;
  const inputId = useId();
  const errorId = useId();

  // Valor que a pessoa está digitando/arrastando. Fica separado do valor do servidor
  // para a tela não "pular" enquanto o envio está pendente.
  const [draft, setDraft] = useState<ControlValue>(state.value);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setDraft(state.value);
    setError(null);
  }, [state.value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (value: ControlValue, delayMs = 0) => {
    setDraft(value);
    clearTimeout(timer.current);

    const check = validateControlValue(control, value);
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    setError(null);

    if (delayMs === 0) onCommit(value);
    else timer.current = setTimeout(() => onCommit(value), delayMs);
  };

  return (
    <>
      <div className={styles.row}>
        <label htmlFor={inputId} className={styles.label}>
          {control.label}
        </label>

        <ControlInput
          id={inputId}
          control={control}
          draft={draft}
          disabled={disabled}
          describedBy={error ? errorId : undefined}
          onDraft={commit}
        />

        <button
          type="button"
          className={styles.resetOne}
          disabled={disabled || state.isDefault}
          title={`Restaurar o padrão (${String(control.default)})`}
          aria-label={`Restaurar o padrão de ${control.label}`}
          onClick={onReset}
        >
          <Icon name="undo" size={12} />
        </button>
      </div>

      {control.description && <p className={styles.description}>{control.description}</p>}
      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </>
  );
};

type ControlInputProps = {
  id: string;
  control: EndpointControl;
  draft: ControlValue;
  disabled: boolean;
  describedBy?: string;
  onDraft: (value: ControlValue, delayMs?: number) => void;
};

const ControlInput = ({
  id,
  control,
  draft,
  disabled,
  describedBy,
  onDraft,
}: ControlInputProps) => {
  switch (control.type) {
    case 'switch':
      return (
        <Switch
          checked={draft === true}
          label={control.label}
          disabled={disabled}
          onToggle={() => onDraft(draft !== true)}
        />
      );

    case 'select':
      return (
        <select
          id={id}
          className={styles.input}
          value={String(draft)}
          disabled={disabled}
          onChange={(event) => onDraft(event.target.value)}
        >
          {control.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'slider':
      return (
        <span className={styles.sliderWrap}>
          <input
            id={id}
            type="range"
            className={styles.slider}
            min={control.min}
            max={control.max}
            step={control.step}
            value={Number(draft)}
            disabled={disabled}
            onChange={(event) => onDraft(Number(event.target.value), COMMIT_DELAY_MS)}
          />
          <output className={styles.sliderValue} htmlFor={id}>
            {String(draft)}
          </output>
        </span>
      );

    case 'number':
      return (
        <input
          id={id}
          type="number"
          className={styles.input}
          min={control.min}
          max={control.max}
          step={control.step}
          value={typeof draft === 'number' && Number.isFinite(draft) ? draft : ''}
          disabled={disabled}
          aria-invalid={!!describedBy}
          aria-describedby={describedBy}
          onChange={(event) =>
            onDraft(
              event.target.value === '' ? Number.NaN : Number(event.target.value),
              COMMIT_DELAY_MS,
            )
          }
        />
      );

    case 'text':
      return (
        <input
          id={id}
          type="text"
          className={styles.input}
          maxLength={control.maxLength}
          value={String(draft)}
          disabled={disabled}
          aria-invalid={!!describedBy}
          aria-describedby={describedBy}
          onChange={(event) => onDraft(event.target.value, COMMIT_DELAY_MS)}
        />
      );
  }
};

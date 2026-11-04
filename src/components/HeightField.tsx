import { useEffect, useState } from 'react';
import {
  cmToFeetInches,
  feetInchesToCm,
  isValidDecimalInput,
  parseDecimal,
  type HeightUnit,
} from '../domain/units';

const PREF_KEY = 'softshape-height-unit';

interface Props {
  /** Stored canonically in centimetres (may be undefined). */
  valueCm: number | undefined;
  onChangeCm: (cm: number | undefined) => void;
  optional?: boolean;
  id?: string;
}

export function HeightField({ valueCm, onChangeCm, optional = true, id = 'height' }: Props) {
  const [unit, setUnit] = useState<HeightUnit>(() => {
    const saved = localStorage.getItem(PREF_KEY);
    return saved === 'ft' || saved === 'cm' ? saved : 'cm';
  });
  const [cmText, setCmText] = useState(() =>
    valueCm != null && Number.isFinite(valueCm) ? String(valueCm) : '',
  );
  const [feetText, setFeetText] = useState('');
  const [inchesText, setInchesText] = useState('');

  // Sync display when external value changes (e.g. profile load)
  useEffect(() => {
    if (valueCm == null || !Number.isFinite(valueCm)) {
      setCmText('');
      setFeetText('');
      setInchesText('');
      return;
    }
    setCmText(String(valueCm));
    const { feet, inches } = cmToFeetInches(valueCm);
    setFeetText(String(feet));
    setInchesText(String(inches));
  }, [valueCm]);

  function switchUnit(next: HeightUnit) {
    setUnit(next);
    localStorage.setItem(PREF_KEY, next);
    if (valueCm != null && Number.isFinite(valueCm)) {
      setCmText(String(valueCm));
      const { feet, inches } = cmToFeetInches(valueCm);
      setFeetText(String(feet));
      setInchesText(String(inches));
    }
  }

  function onCmChange(raw: string) {
    if (!isValidDecimalInput(raw)) return;
    setCmText(raw);
    const n = parseDecimal(raw);
    onChangeCm(n);
  }

  function onFeetChange(raw: string) {
    // Whole feet only
    if (raw !== '' && !/^\d*$/.test(raw)) return;
    setFeetText(raw);
    const feet = raw === '' ? 0 : Number(raw);
    const inches = parseDecimal(inchesText) ?? 0;
    if (raw === '' && inchesText.trim() === '') {
      onChangeCm(undefined);
      return;
    }
    onChangeCm(feetInchesToCm(feet, inches));
  }

  function onInchesChange(raw: string) {
    if (!isValidDecimalInput(raw)) return;
    setInchesText(raw);
    const inches = parseDecimal(raw);
    const feet = feetText === '' ? 0 : Number(feetText);
    if ((raw === '' || inches == null) && feetText === '') {
      onChangeCm(undefined);
      return;
    }
    onChangeCm(feetInchesToCm(feet, inches ?? 0));
  }

  return (
    <fieldset className="height-field">
      <legend>
        Height{optional ? ' (optional)' : ''}
      </legend>
      <div className="unit-toggle" role="group" aria-label="Height units">
        <button
          type="button"
          className={`unit-toggle__btn ${unit === 'cm' ? 'is-on' : ''}`}
          onClick={() => switchUnit('cm')}
        >
          cm
        </button>
        <button
          type="button"
          className={`unit-toggle__btn ${unit === 'ft' ? 'is-on' : ''}`}
          onClick={() => switchUnit('ft')}
        >
          ft + in
        </button>
      </div>

      {unit === 'cm' ? (
        <label htmlFor={id}>
          Centimetres
          <input
            id={id}
            type="text"
            inputMode="decimal"
            placeholder="e.g. 167.5"
            value={cmText}
            onChange={(e) => onCmChange(e.target.value)}
          />
        </label>
      ) : (
        <div className="height-field__imperial">
          <label htmlFor={`${id}-ft`}>
            Feet
            <input
              id={`${id}-ft`}
              type="text"
              inputMode="numeric"
              placeholder="5"
              value={feetText}
              onChange={(e) => onFeetChange(e.target.value)}
            />
          </label>
          <label htmlFor={`${id}-in`}>
            Inches
            <input
              id={`${id}-in`}
              type="text"
              inputMode="decimal"
              placeholder="5.5"
              value={inchesText}
              onChange={(e) => onInchesChange(e.target.value)}
            />
          </label>
        </div>
      )}
    </fieldset>
  );
}

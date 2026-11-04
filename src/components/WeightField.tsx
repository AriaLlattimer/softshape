import { useEffect, useState } from 'react';
import { isValidDecimalInput, parseDecimal } from '../domain/units';

interface Props {
  valueKg: number | undefined;
  onChangeKg: (kg: number | undefined) => void;
  label?: string;
  required?: boolean;
  id?: string;
  min?: number;
  max?: number;
}

export function WeightField({
  valueKg,
  onChangeKg,
  label = 'Weight (kg)',
  required = false,
  id = 'weight',
  min = 30,
  max = 300,
}: Props) {
  const [text, setText] = useState(() =>
    valueKg != null && Number.isFinite(valueKg) ? String(valueKg) : '',
  );

  useEffect(() => {
    if (valueKg == null || !Number.isFinite(valueKg)) {
      setText('');
      return;
    }
    // Don't clobber in-progress typing like "70."
    const parsed = parseDecimal(text);
    if (parsed !== valueKg) {
      setText(String(valueKg));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKg]);

  return (
    <label htmlFor={id}>
      {label}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder="e.g. 72.5"
        value={text}
        required={required}
        aria-valuemin={min}
        aria-valuemax={max}
        onChange={(e) => {
          const raw = e.target.value;
          if (!isValidDecimalInput(raw)) return;
          setText(raw);
          onChangeKg(parseDecimal(raw));
        }}
      />
      <span className="field-hint">Decimals allowed (e.g. 72.5)</span>
    </label>
  );
}

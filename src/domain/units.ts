export type HeightUnit = 'cm' | 'ft';

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round((totalInches - feet * 12) * 10) / 10; // 1 decimal
  if (inches >= 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return Math.round(totalInches * 2.54 * 100) / 100; // 2 decimal cm
}

export function parseDecimal(raw: string): number | undefined {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '' || trimmed === '.' || trimmed === '-') return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

/** Allow intermediate typing like "70." or "5.5" */
export function isValidDecimalInput(raw: string): boolean {
  return raw === '' || /^-?\d*[.,]?\d*$/.test(raw.trim());
}

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Año opcional: entero entre 1900 y año actual + 1 (como `@Min` / `@Max` en Nest). */
export function optionalAnioVehiculoValidator(): ValidatorFn {
  const maxY = new Date().getFullYear() + 1;
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === '' || raw === null || raw === undefined) return null;
    const n = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
    if (Number.isNaN(n) || !Number.isFinite(n)) return { number: true };
    if (!Number.isInteger(n)) return { integer: true };
    if (n < 1900 || n > maxY) return { yearRange: { min: 1900, max: maxY } };
    return null;
  };
}

/** Número opcional ≥ `min` (`@IsNumber` + `@Min` en Nest). */
export function optionalMinNumber(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === '' || raw === null || raw === undefined) return null;
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw).trim());
    if (Number.isNaN(n) || !Number.isFinite(n)) return { number: true };
    return n >= min ? null : { min: { min, actual: n } };
  };
}

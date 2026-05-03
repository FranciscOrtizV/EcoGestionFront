import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Misma regla que `CreateUsuarioDto.password` en Nest (`@Matches`).
 * Mayúscula, minúscula y al menos un número o carácter especial.
 */
export const NEST_CREATE_USUARIO_PASSWORD_PATTERN =
  /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

export function nestCreateUsuarioPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value as string | null | undefined;
    if (v == null || v === '') return null;
    return NEST_CREATE_USUARIO_PASSWORD_PATTERN.test(v) ? null : { nestPassword: true };
  };
}

/** Si hay texto, debe cumplir longitud mínima (equivalente a `@IsOptional()` + `@MinLength(8)` en phone). */
export function optionalMinLength(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') return null;
    const len = String(raw).trim().length;
    return len >= min ? null : { minlength: { requiredLength: min, actualLength: len } };
  };
}

/** `@IsUUID()` en cada elemento de rolesIds. */
export function uuidValidator(): ValidatorFn {
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value as string | null | undefined;
    if (v == null || v === '') return null;
    return re.test(String(v)) ? null : { uuid: true };
  };
}

/** Contraseña opcional al editar: vacío no cambia; si hay texto, misma regla que alta. */
export function optionalUpdateUsuarioPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const trim = String(control.value ?? '').trim();
    if (trim === '') return null;
    if (trim.length < 6) {
      return { minlength: { requiredLength: 6, actualLength: trim.length } };
    }
    if (trim.length > 50) {
      return { maxlength: { requiredLength: 50, actualLength: trim.length } };
    }
    return NEST_CREATE_USUARIO_PASSWORD_PATTERN.test(trim) ? null : { nestPassword: true };
  };
}

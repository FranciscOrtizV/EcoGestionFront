import { RolesEnum } from '../enums/Rol.enum';

/** Pantalla de inicio de cada módulo (coinciden con `app.routes.ts`). */
export const PANEL_HOME_URLS = {
  admin: '/admin/inicio',
  /** Solo administración (rol ADMIN). */
  adminUsuarios: '/admin/usuarios',
  supervisor: '/supervisor/inicio',
  planificador: '/planificador/inicio',
  conductor: '/conductor/inicio',
} as const;

function roleNames(user: { roles?: { nombre: string }[] } | null): Set<string> {
  return new Set(user?.roles?.map((r) => r.nombre) ?? []);
}

/**
 * Rol efectivo para menú y redirección (orden: admin → supervisor → planificador → conductor).
 * En backend, “camionero” debe mapearse al rol `CONDUCTOR`.
 */
export function pickEffectiveRole(
  user: { roles?: { nombre: string }[] } | null
): RolesEnum | null {
  const names = roleNames(user);
  if (names.has(RolesEnum.ADMIN)) return RolesEnum.ADMIN;
  if (names.has(RolesEnum.SUPERVISOR)) return RolesEnum.SUPERVISOR;
  if (names.has(RolesEnum.PLANIFICADOR)) return RolesEnum.PLANIFICADOR;
  if (names.has(RolesEnum.CONDUCTOR)) return RolesEnum.CONDUCTOR;
  return null;
}

export function resolvePrimaryPanelUrl(
  user: { roles?: { nombre: string }[] } | null
): string {
  const role = pickEffectiveRole(user);
  switch (role) {
    case RolesEnum.CONDUCTOR:
      return PANEL_HOME_URLS.conductor;
    case RolesEnum.PLANIFICADOR:
      return PANEL_HOME_URLS.planificador;
    case RolesEnum.SUPERVISOR:
      return PANEL_HOME_URLS.supervisor;
    case RolesEnum.ADMIN:
      return PANEL_HOME_URLS.admin;
    default:
      return PANEL_HOME_URLS.admin;
  }
}

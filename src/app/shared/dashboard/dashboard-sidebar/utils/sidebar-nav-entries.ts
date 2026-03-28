import { RolesEnum } from '../../../enums/Rol.enum';
import type { SidebarNavEntry } from '../../../types';

export const SIDEBAR_CONDUCTOR: SidebarNavEntry[] = [
  { kind: 'section', id: 'sec-conductor', label: 'CONDUCTOR' },
  { kind: 'link', id: 'con-inicio', iconClass: 'ri-truck-line', label: 'Inicio' }
];

export const SIDEBAR_PLANIFICADOR: SidebarNavEntry[] = [
  { kind: 'section', id: 'sec-plan', label: 'PLANIFICACIÓN' },
  { kind: 'link', id: 'plan-inicio', iconClass: 'ri-calendar-line', label: 'Inicio' },
  { kind: 'link', id: 'plan-rutas', iconClass: 'ri-route-line', label: 'Rutas' }
];

export const SIDEBAR_SUPERVISOR: SidebarNavEntry[] = [
  { kind: 'section', id: 'sec-sup', label: 'SUPERVISIÓN' },
  { kind: 'link', id: 'sup-inicio', iconClass: 'ri-eye-line', label: 'Inicio' },
  { kind: 'link', id: 'sup-equipos', iconClass: 'ri-team-line', label: 'Equipos' }
];

export const SIDEBAR_ADMIN: SidebarNavEntry[] = [
  { kind: 'section', id: 'sec-admin', label: 'ADMINISTRACION' },
  { kind: 'link', id: 'adm-inicio', iconClass: 'ri-eye-line', label: 'Inicio' },
  { kind: 'link', id: 'adm-equipos', iconClass: 'ri-team-line', label: 'Equipos' }
];

/**
 * Si el usuario tiene varios roles, se usa el de mayor alcance en este orden.
 */
export function resolveSidebarByRoles(
  user: { roles?: { nombre: string }[] } | null
): SidebarNavEntry[] {
  const names = new Set(user?.roles?.map((r) => r.nombre) ?? []);
  if (names.has(RolesEnum.ADMIN)) return SIDEBAR_ADMIN;
  if (names.has(RolesEnum.SUPERVISOR)) return SIDEBAR_SUPERVISOR;
  if (names.has(RolesEnum.PLANIFICADOR)) return SIDEBAR_PLANIFICADOR;
  if (names.has(RolesEnum.CONDUCTOR)) return SIDEBAR_CONDUCTOR;
  return SIDEBAR_ADMIN;
}

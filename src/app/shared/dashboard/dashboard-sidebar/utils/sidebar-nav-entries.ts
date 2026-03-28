import { RolesEnum } from '../../../enums/Rol.enum';
import type { SidebarNavEntry } from '../../../types';
import { PANEL_HOME_URLS, pickEffectiveRole } from '../../admin-panel-routes';

const inicioLink = (id: string, icon: string, path: string): SidebarNavEntry => ({
  kind: 'link',
  id,
  iconClass: icon,
  label: 'Inicio',
  routerLink: path,
});

export const SIDEBAR_CONDUCTOR: SidebarNavEntry[] = [
  { kind: 'section', id: 'sec-conductor', label: 'CONDUCTOR' },
  inicioLink('con-inicio', 'ri-truck-line', PANEL_HOME_URLS.conductor),
];

export const SIDEBAR_PLANIFICADOR: SidebarNavEntry[] = [
  { kind: 'section', id: 'sec-plan', label: 'PLANIFICACIÓN' },
  inicioLink('plan-inicio', 'ri-calendar-line', PANEL_HOME_URLS.planificador),
];

export const SIDEBAR_SUPERVISOR: SidebarNavEntry[] = [
  { kind: 'section', id: 'sec-sup', label: 'SUPERVISIÓN' },
  inicioLink('sup-inicio', 'ri-eye-line', PANEL_HOME_URLS.supervisor),
];

export const SIDEBAR_ADMIN: SidebarNavEntry[] = [
  { kind: 'section', id: 'sec-admin', label: 'ADMINISTRACIÓN' },
  inicioLink('adm-inicio', 'ri-settings-3-line', PANEL_HOME_URLS.admin),
];

export function resolveSidebarByRoles(
  user: { roles?: { nombre: string }[] } | null
): SidebarNavEntry[] {
  const role = pickEffectiveRole(user) ?? RolesEnum.ADMIN;
  switch (role) {
    case RolesEnum.CONDUCTOR:
      return SIDEBAR_CONDUCTOR;
    case RolesEnum.PLANIFICADOR:
      return SIDEBAR_PLANIFICADOR;
    case RolesEnum.SUPERVISOR:
      return SIDEBAR_SUPERVISOR;
    case RolesEnum.ADMIN:
    default:
      return SIDEBAR_ADMIN;
  }
}

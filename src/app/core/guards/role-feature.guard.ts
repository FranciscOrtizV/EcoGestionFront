import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { resolvePrimaryPanelUrl } from '../../shared/dashboard/admin-panel-routes';
import { RolesEnum } from '../../shared/enums/Rol.enum';
import { AuthService } from '../services/auth.service';

/**
 * Solo permite la ruta si el usuario tiene al menos uno de los roles indicados.
 * Si no, redirige al inicio del módulo que le corresponde según sus roles.
 */
export function roleFeatureGuard(allowedRoles: readonly RolesEnum[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser();
    if (!user) {
      return router.createUrlTree(['/auth', 'login']);
    }
    const names = new Set(user.roles.map((r) => r.nombre));
    if (allowedRoles.some((role) => names.has(role))) {
      return true;
    }
    return router.parseUrl(resolvePrimaryPanelUrl(user));
  };
}

export const adminAreaGuard = roleFeatureGuard([RolesEnum.ADMIN]);
export const supervisorAreaGuard = roleFeatureGuard([RolesEnum.SUPERVISOR, RolesEnum.ADMIN]);
export const planificadorAreaGuard = roleFeatureGuard([RolesEnum.PLANIFICADOR]);
export const conductorAreaGuard = roleFeatureGuard([RolesEnum.CONDUCTOR]);

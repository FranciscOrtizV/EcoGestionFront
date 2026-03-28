import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Requiere tokens y perfil cargado (tras F5 el token existe pero el usuario está solo en memoria:
 * se llama a getMe una vez).
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth', 'login']);
  }

  if (auth.currentUser()) {
    return true;
  }

  return auth.loadCurrentUser().pipe(
    map(() => true),
    catchError(() => {
      auth.logout();
      return of(false);
    })
  );
};

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import {
  adminAreaGuard,
  conductorAreaGuard,
  planificadorAreaGuard,
  supervisorAreaGuard,
} from './core/guards/role-feature.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth' },
  {
    path: 'auth',
    loadChildren: () => import('./feature/auth/auth.routes').then((m) => m.AUTH_ROUTES),
    canActivate: [guestGuard],
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminAreaGuard],
    loadChildren: () => import('./feature/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'supervisor',
    canActivate: [authGuard, supervisorAreaGuard],
    loadChildren: () =>
      import('./feature/supervisor/supervisor.routes').then((m) => m.SUPERVISOR_ROUTES),
  },
  {
    path: 'planificador',
    canActivate: [authGuard, planificadorAreaGuard],
    loadChildren: () =>
      import('./feature/planificador/planificador.routes').then((m) => m.PLANIFICADOR_ROUTES),
  },
  {
    path: 'conductor',
    canActivate: [authGuard, conductorAreaGuard],
    loadChildren: () =>
      import('./feature/conductor/conductor.routes').then((m) => m.CONDUCTOR_ROUTES),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];

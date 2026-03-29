import { Routes } from '@angular/router';

/** Rutas del módulo administración: solo `inicio` bajo el layout del dashboard. */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../shared/dashboard/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./pages/inicio/inicio.component').then((m) => m.AdminInicioComponent),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('../users/pages/users/users.page').then((m) => m.UsersPage),
      },
    ]
  }
];

import { Routes } from '@angular/router';

export const CONDUCTOR_ROUTES: Routes = [
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
          import('./pages/inicio/inicio.component').then((m) => m.ConductorInicioComponent),
      },
    ]
  }
];

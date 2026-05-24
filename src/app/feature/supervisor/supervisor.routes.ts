import { Routes } from '@angular/router';

export const SUPERVISOR_ROUTES: Routes = [
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
          import('./pages/inicio/inicio.component').then((m) => m.SupervisorInicioComponent),
      },
      {
        path: 'incidencias',
        loadComponent: () =>
          import('../incidencias/pages/incidencias/incidenciasPage.component').then(
            (m) => m.IncidenciasPage,
          ),
      },
      {
        path: 'estadisticas-rutas',
        loadComponent: () =>
          import('./pages/estadisticas-rutas/estadisticas-rutas.component').then(
            (m) => m.SupervisorEstadisticasRutasComponent,
          ),
      },
      {
        path: 'estadisticas-incidencias',
        loadComponent: () =>
          import('./pages/estadisticas-incidencias/estadisticas-incidencias.component').then(
            (m) => m.SupervisorEstadisticasIncidenciasComponent,
          ),
      },
    ]
  }
];

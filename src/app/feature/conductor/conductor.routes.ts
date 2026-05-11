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
      {
        path: 'mis-rutas',
        loadComponent: () =>
          import('./pages/mis-rutas/mis-rutas.component').then((m) => m.ConductorMisRutasComponent),
      },
      {
        path: 'mis-rutas/:ejecucionRutaId',
        loadComponent: () =>
          import('./pages/ejecucion-ruta-detalle/ejecucion-ruta-detalle.component').then(
            (m) => m.EjecucionRutaDetalleComponent,
          ),
      },
    ]
  }
];

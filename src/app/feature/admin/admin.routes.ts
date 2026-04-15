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
          import('../users/pages/users/usersPage.component').then((m) => m.UsersPage),
      },
      {
        path: 'vehiculos',
        loadComponent: () =>
          import('../vehiculos/pages/vehiculos/vehiculosPage.component').then((m) => m.VehiculosPage),
      },
      {
        path: 'tiposIncidencias',
        loadComponent: () =>
          import('../tiposIncidencias/pages/tiposIncidencias/tiposIncidencias.component').then(
            (m) => m.TiposIncidenciasPage,
          ),
      },
      {
        path: 'zonas',
        loadComponent: () =>
          import('../zonas/pages/zonas/zonas.component').then((m) => m.ZonasPage),
      },

    ]
  }
];

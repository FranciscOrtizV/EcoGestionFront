import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./auth-shell/auth-shell.component').then((m) => m.AuthShellComponent),
    canActivate: [guestGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/login-page/login.component').then((m) => m.LoginComponent)
      }
    ]
  }
];

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

function isPublicAuthUrl(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/refresh');
}

function isApiRequest(url: string): boolean {
  return url.startsWith(environment.apiUrl);
}

/**
 * Añade Authorization a llamadas al API Nest y reintenta tras 401 con refresh.
 * Login/refresh no pasan por aquí (AuthService usa HttpBackend).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url) || isPublicAuthUrl(req.url)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.accessToken();

  let outgoing = req;
  if (token) {
    outgoing = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(outgoing).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      return auth.refreshTokens().pipe(
        switchMap(() => {
          const newToken = auth.accessToken();
          if (!newToken) {
            auth.forceLogout();
            return throwError(() => err);
          }
          const retry = req.clone({
            setHeaders: { Authorization: `Bearer ${newToken}` }
          });
          return next(retry).pipe(
            catchError((e2) => {
              auth.forceLogout();
              void router.navigateByUrl('/auth/login');
              return throwError(() => e2);
            })
          );
        }),
        catchError(() => {
          auth.forceLogout();
          void router.navigateByUrl('/auth/login');
          return throwError(() => err);
        })
      );
    })
  );
};

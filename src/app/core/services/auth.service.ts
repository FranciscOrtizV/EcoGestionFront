import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { type ApiResponse, unwrapApiData } from '../models/api-response.model';
import type { LoginRequestBody, TokenPair } from '../models/auth-token.model';
import type { CurrentUser } from '../models/user.model';

const STORAGE_ACCESS = 'ecogestion_access_token';
const STORAGE_REFRESH = 'ecogestion_refresh_token';

/** Rutas que no llevan Bearer (login / refresh van sin HttpClient interceptado). */
const AUTH_PATHS = {
  login: () => `${environment.apiUrl}/auth/login`,
  refresh: () => `${environment.apiUrl}/auth/refresh`,
  getMe: () => `${environment.apiUrl}/usuarios/getMe`
} as const;

function normalizeTokenResponse(body: unknown): TokenPair {
  const r = body as Record<string, unknown>;
  const access = (r['access_token'] ?? r['accessToken']) as string | undefined;
  const refresh = (r['refresh_token'] ?? r['refreshToken']) as string | undefined;

  if (!access || !refresh)
    throw new Error('Respuesta de tokens inválida');

  return { accessToken: access, refreshToken: refresh };
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly httpPlain: HttpClient;

  private readonly _accessToken = signal<string | null>(this.readStored(STORAGE_ACCESS));
  private readonly _refreshToken = signal<string | null>(this.readStored(STORAGE_REFRESH));
  private readonly _currentUser = signal<CurrentUser | null>(null);

  readonly accessToken = this._accessToken.asReadonly();
  /** Perfil del usuario logueado; solo en memoria (no en sessionStorage). */
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._accessToken() !== null);


  constructor(
    httpBackend: HttpBackend,
    private readonly http: HttpClient,
    private readonly router: Router
  ) {
    this.httpPlain = new HttpClient(httpBackend);
  }

  login(credentials: LoginRequestBody): Observable<void> {
    const body: LoginRequestBody = {
      email: credentials.email.trim(),
      password: credentials.password
    };

    if (!body.email || !body.password) {
      return throwError(() => new Error('Credenciales vacías'));
    }

    return this.httpPlain.post<unknown>(AUTH_PATHS.login(), body).pipe(
      map((res) => normalizeTokenResponse(res)),
      tap((pair) => this.persistTokens(pair)),
      switchMap(() => this.loadCurrentUser()),
      catchError((err) => throwError(() => err))
    );
  }

  /**
   * GET con Bearer (HttpClient interceptado). Guarda el resultado en `currentUser`.
   * Tras login ya se llama solo; úsalo también si necesitas refrescar el perfil.
   */
  loadCurrentUser(): Observable<void> {
    return this.http.get<ApiResponse<CurrentUser>>(AUTH_PATHS.getMe()).pipe(
      map((res) => unwrapApiData(res)),
      tap((user) => this._currentUser.set(user)),
      map(() => void 0)
    );
  }

  /**
   * Renueva el access token. Lo usa el interceptor ante 401.
   * Usa HttpBackend para no pasar por el interceptor.
   */
  refreshTokens(): Observable<void> {
    const refresh = this._refreshToken();
    if (!refresh) {
      return throwError(() => new Error('Sin refresh token'));
    }
    const body = { refreshToken: refresh };
    return this.httpPlain.post<unknown>(AUTH_PATHS.refresh(), body).pipe(
      map((res) => normalizeTokenResponse(res)),
      tap((pair) => this.persistTokens(pair)),
      map(() => void 0),
      catchError((err) => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    this.clearSession();
    void this.router.navigateByUrl('/auth/login');
  }

  /** Llamado por el interceptor cuando el refresh falla definitivamente. */
  forceLogout(): void {
    this.clearSession();
    void this.router.navigateByUrl('/auth/login');
  }

  // Persiste en el sesionStorage
  private persistTokens(pair: TokenPair): void {
    this._accessToken.set(pair.accessToken);
    this._refreshToken.set(pair.refreshToken);
    sessionStorage.setItem(STORAGE_ACCESS, pair.accessToken);
    sessionStorage.setItem(STORAGE_REFRESH, pair.refreshToken);
  }

  // Limpia tokens y usuario en memoria
  private clearSession(): void {
    this._accessToken.set(null);
    this._refreshToken.set(null);
    this._currentUser.set(null);
    sessionStorage.removeItem(STORAGE_ACCESS);
    sessionStorage.removeItem(STORAGE_REFRESH);
  }

  // Lee el sesionStorage
  private readStored(key: string): string | null {
    return sessionStorage.getItem(key);
  }
}

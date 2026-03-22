import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'ecogestion_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _userEmail = signal<string | null>(this.readStoredEmail());

  readonly userEmail = this._userEmail.asReadonly();
  readonly isAuthenticated = computed(() => this._userEmail() !== null);

  login(email: string, password: string): boolean {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      return false;
    }
    this._userEmail.set(trimmed);
    sessionStorage.setItem(STORAGE_KEY, trimmed);
    return true;
  }

  logout(): void {
    this._userEmail.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  private readStoredEmail(): string | null {
    return sessionStorage.getItem(STORAGE_KEY);
  }
}

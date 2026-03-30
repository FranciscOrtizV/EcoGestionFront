import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _loading = signal(false);

  readonly loading = this._loading.asReadonly();

  setLoading(value: boolean): void {
    this._loading.set(value);
  }
}

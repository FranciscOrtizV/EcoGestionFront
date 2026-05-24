import { DecimalPipe, NgClass } from '@angular/common';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, EMPTY, finalize } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { EjecucionRutasService } from '../../../../core/services/ejecucion-rutas.service';
import { LoadingService } from '../../../../core/services/loading.service';
import {
  MapPointPickerComponent,
  type MapPointSelectedEvent,
} from '../../../../shared/components/map-point-picker/map-point-picker.component';

@Component({
  selector: 'app-finalizar-ejecucion-ruta-modal',
  standalone: true,
  imports: [DecimalPipe, NgClass, ReactiveFormsModule, MapPointPickerComponent],
  templateUrl: './finalizar-ejecucion-ruta-modal.component.html',
})
export class FinalizarEjecucionRutaModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ejecucionRutasService = inject(EjecucionRutasService);
  private readonly loadingService = inject(LoadingService);

  readonly ejecucionRutaId = input.required<string>();

  cancelled = output<void>();
  finalizada = output<void>();

  protected readonly mapLat = signal<number | null>(null);
  protected readonly mapLng = signal<number | null>(null);
  protected readonly obteniendoUbicacion = signal(false);

  readonly form = this.fb.nonNullable.group({
    odometro: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    latitud: [0, [Validators.required]],
    longitud: [0, [Validators.required]],
  });

  ngOnInit(): void {
    const { lat, lng } = environment.mapDefaultCenter;
    this.establecerCoordenadas(lat, lng);
    this.intentarUbicacionActual();
  }

  protected onMapPointSelected(ev: MapPointSelectedEvent): void {
    this.establecerCoordenadas(ev.lat, ev.lng);
  }

  protected usarUbicacionActual(): void {
    if (!('geolocation' in navigator)) {
      toast.warning('Tu navegador no permite obtener la ubicación.');
      return;
    }

    this.obteniendoUbicacion.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.obteniendoUbicacion.set(false);
        this.establecerCoordenadas(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        this.obteniendoUbicacion.set(false);
        toast.error('No se pudo obtener tu ubicación. Marca el punto manualmente en el mapa.');
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      toast.warning('Revisa el odómetro final y la ubicación en el mapa.');
      return;
    }

    const raw = this.form.getRawValue();
    const odometro = raw.odometro;
    if (odometro == null) {
      this.form.controls.odometro.markAsTouched();
      toast.warning('Ingresa el odómetro final del vehículo.');
      return;
    }

    this.loadingService.setLoading(true);
    this.ejecucionRutasService
      .finalizar(this.ejecucionRutaId(), {
        latitudFin: Number(raw.latitud),
        longitudFin: Number(raw.longitud),
        odometroFin: Number(odometro),
      })
      .pipe(
        catchError((err: unknown) => {
          toast.error(this.mensajeErrorFinalizar(err));
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success('Ruta finalizada correctamente.');
        this.finalizada.emit();
      });
  }

  protected fieldInvalid(name: 'odometro' | 'latitud' | 'longitud'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  private establecerCoordenadas(lat: number, lng: number): void {
    this.mapLat.set(lat);
    this.mapLng.set(lng);
    this.form.patchValue({ latitud: lat, longitud: lng });
  }

  private mensajeErrorFinalizar(err: unknown): string {
    if (err instanceof Error && err.message.trim() !== '') {
      return err.message;
    }
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const msg = (body as { message: unknown }).message;
        if (typeof msg === 'string' && msg.trim() !== '') {
          return msg;
        }
        if (Array.isArray(msg) && msg.length > 0) {
          return msg.map(String).join('. ');
        }
      }
    }
    return 'No se pudo finalizar la ruta. Inténtalo de nuevo.';
  }

  private intentarUbicacionActual(): void {
    if (!('geolocation' in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.establecerCoordenadas(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        /* Sin permiso o error: se mantiene el centro por defecto. */
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 },
    );
  }
}

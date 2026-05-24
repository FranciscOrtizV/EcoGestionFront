import { DecimalPipe, NgClass } from '@angular/common';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WebcamImage, WebcamInitError, WebcamModule } from 'ngx-webcam';
import { toast } from 'ngx-sonner';
import { Subject, catchError, EMPTY, finalize } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IncidenciasService } from '../../../../core/services/incidencias.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { TiposIncidenciasService } from '../../../../core/services/tiposIncidencias.service';
import {
  MapPointPickerComponent,
  type MapPointSelectedEvent,
} from '../../../../shared/components/map-point-picker/map-point-picker.component';
import type { TipoIncidenciaRow } from '../../../tiposIncidencias/types';
import { PrioridadIncidenciaEnum } from '../../../../shared/enums/PrioridadIncidencia.enum';

const PRIORIDAD_OPCIONES: readonly { value: PrioridadIncidenciaEnum; label: string }[] = [
  { value: PrioridadIncidenciaEnum.BAJA, label: 'Baja' },
  { value: PrioridadIncidenciaEnum.MEDIA, label: 'Media' },
  { value: PrioridadIncidenciaEnum.ALTA, label: 'Alta' },
  { value: PrioridadIncidenciaEnum.CRITICA, label: 'Crítica' },
];

@Component({
  selector: 'app-reportar-incidencia-punto-modal',
  standalone: true,
  imports: [DecimalPipe, NgClass, ReactiveFormsModule, WebcamModule, MapPointPickerComponent],
  templateUrl: './reportar-incidencia-punto-modal.component.html',
})
export class ReportarIncidenciaPuntoModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly tiposIncidenciasService = inject(TiposIncidenciasService);
  private readonly loadingService = inject(LoadingService);
  private readonly triggerCaptura = new Subject<void>();

  readonly ejecucionRutaId = input.required<string>();
  readonly puntoId = input.required<string>();
  readonly puntoNombre = input.required<string>();
  readonly puntoLatitud = input<number | null>(null);
  readonly puntoLongitud = input<number | null>(null);

  cancelled = output<void>();
  reportada = output<void>();

  protected readonly opcionesPrioridad = PRIORIDAD_OPCIONES;
  protected readonly tiposIncidencia = signal<TipoIncidenciaRow[]>([]);
  protected readonly tiposCargando = signal(true);
  protected readonly mostrarCamara = signal(false);
  protected readonly fotoPreview = signal<string | null>(null);
  protected readonly mapLat = signal<number | null>(null);
  protected readonly mapLng = signal<number | null>(null);
  protected readonly obteniendoUbicacion = signal(false);
  protected readonly triggerCaptura$ = this.triggerCaptura.asObservable();

  readonly form = this.fb.nonNullable.group({
    tipoIncidenciaId: ['', Validators.required],
    titulo: ['', [Validators.required, Validators.pattern(/\S/)]],
    descripcion: ['', [Validators.required, Validators.pattern(/\S/)]],
    prioridad: [PrioridadIncidenciaEnum.MEDIA, Validators.required],
    latitud: [0, [Validators.required]],
    longitud: [0, [Validators.required]],
    evidenciaFoto: [''],
  });

  ngOnInit(): void {
    this.inicializarUbicacionMapa();

    this.tiposIncidenciasService
      .getTiposIncidencias()
      .pipe(
        catchError(() => {
          toast.error('No se pudieron cargar los tipos de incidencia.');
          return EMPTY;
        }),
        finalize(() => this.tiposCargando.set(false)),
      )
      .subscribe((tipos) => {
        this.tiposIncidencia.set(tipos.filter((t) => t.isActive));
      });
  }

  protected onMapPointSelected(ev: MapPointSelectedEvent): void {
    this.establecerCoordenadas(ev.lat, ev.lng, true);
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
        this.establecerCoordenadas(pos.coords.latitude, pos.coords.longitude, true);
      },
      () => {
        this.obteniendoUbicacion.set(false);
        toast.error('No se pudo obtener tu ubicación. Marca el punto manualmente en el mapa.');
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  }

  protected abrirCamara(): void {
    this.mostrarCamara.set(true);
  }

  protected cerrarCamara(): void {
    this.mostrarCamara.set(false);
  }

  protected tomarFoto(): void {
    this.triggerCaptura.next();
  }

  protected onFotoCapturada(image: WebcamImage): void {
    this.fotoPreview.set(image.imageAsDataUrl);
    this.form.patchValue({ evidenciaFoto: image.imageAsBase64 });
    this.mostrarCamara.set(false);
  }

  protected onErrorCamara(error: WebcamInitError): void {
    const mensajes: Record<string, string> = {
      NotAllowedError: 'Permiso de cámara denegado. Habilítalo en el navegador.',
      NotFoundError: 'No se encontró ninguna cámara en el dispositivo.',
      NotReadableError: 'La cámara está en uso por otra aplicación.',
    };
    toast.error(mensajes[error.mediaStreamError.name] ?? 'No se pudo acceder a la cámara.');
    this.mostrarCamara.set(false);
  }

  protected quitarFoto(): void {
    this.fotoPreview.set(null);
    this.form.patchValue({ evidenciaFoto: '' });
  }

  protected volverATomarFoto(): void {
    this.quitarFoto();
    this.mostrarCamara.set(true);
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      toast.warning('Revisa los campos obligatorios del formulario.');
      return;
    }

    const raw = this.form.getRawValue();

    this.loadingService.setLoading(true);
    this.incidenciasService
      .reportarPunto({
        puntoRutaEjecucionId: this.puntoId(),
        tipoIncidenciaId: raw.tipoIncidenciaId,
        titulo: raw.titulo.trim(),
        descripcion: raw.descripcion.trim(),
        prioridad: raw.prioridad,
        latitud: raw.latitud,
        longitud: raw.longitud,
        evidenciaFoto: raw.evidenciaFoto === '' ? null : raw.evidenciaFoto,
      })
      .pipe(
        catchError(() => {
          toast.error('No se pudo reportar la incidencia. Inténtalo de nuevo.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success('Incidencia reportada correctamente.');
        this.reportada.emit();
      });
  }

  protected fieldInvalid(
    name: 'tipoIncidenciaId' | 'titulo' | 'descripcion' | 'prioridad' | 'latitud' | 'longitud',
  ): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  protected ubicacionInvalida(): boolean {
    return (
      (this.fieldInvalid('latitud') || this.fieldInvalid('longitud')) &&
      (this.form.controls.latitud.touched || this.form.controls.longitud.touched)
    );
  }

  private inicializarUbicacionMapa(): void {
    const latPunto = this.puntoLatitud();
    const lngPunto = this.puntoLongitud();
    if (latPunto != null && lngPunto != null) {
      this.establecerCoordenadas(latPunto, lngPunto);
      return;
    }

    const { lat, lng } = environment.mapDefaultCenter;
    this.establecerCoordenadas(lat, lng);
    this.intentarUbicacionActual();
  }

  private establecerCoordenadas(lat: number, lng: number, marcarTocado = false): void {
    this.mapLat.set(lat);
    this.mapLng.set(lng);
    this.form.patchValue({ latitud: lat, longitud: lng });
    if (marcarTocado) {
      this.form.controls.latitud.markAsTouched();
      this.form.controls.longitud.markAsTouched();
    }
  }

  private intentarUbicacionActual(): void {
    if (!('geolocation' in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.establecerCoordenadas(pos.coords.latitude, pos.coords.longitude, true);
      },
      () => {
        /* Sin permiso o error: se mantiene el centro por defecto o coords del punto. */
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 },
    );
  }
}

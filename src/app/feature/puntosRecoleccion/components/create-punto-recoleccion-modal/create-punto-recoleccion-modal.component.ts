import { DecimalPipe, NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize, of } from 'rxjs';
import { LoadingService } from '../../../../core/services/loading.service';
import { PuntosRecoleccionService } from '../../../../core/services/puntos-recoleccion.service';
import { ZonasService } from '../../../../core/services/zonas.service';
import {
  MapPointPickerComponent,
  type MapPointSelectedEvent,
} from '../../../../shared/components/map-point-picker/map-point-picker.component';
import { environment } from '../../../../../environments/environment';
import {
  TIPO_PUNTO_COLECCION_LABELS,
  TipoPuntoColeccionEnum,
} from '../../enums/tipo-punto-coleccion.enum';
import type {
  CreatePuntoRecoleccionRequest,
  PuntoRecoleccionFormModalContext,
  UpdatePuntoRecoleccionRequest,
} from '../../types';
import type { ZonaRow } from '../../../zonas/types';

@Component({
  selector: 'app-create-punto-recoleccion-modal',
  standalone: true,
  imports: [DecimalPipe, NgClass, ReactiveFormsModule, MapPointPickerComponent],
  templateUrl: './create-punto-recoleccion-modal.component.html',
})
export class CreatePuntoRecoleccionModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly puntosService = inject(PuntosRecoleccionService);
  private readonly zonasService = inject(ZonasService);
  private readonly loadingService = inject(LoadingService);

  readonly context = input.required<PuntoRecoleccionFormModalContext>();

  cancelled = output<void>();
  saved = output<void>();

  protected readonly zonas = signal<ZonaRow[]>([]);
  protected readonly mapLat = signal<number | null>(null);
  protected readonly mapLng = signal<number | null>(null);

  private detalleCargado = false;
  private inicialZonaId = '';
  private inicialNombre = '';
  private inicialDireccion = '';
  private inicialReferencia = '';
  private inicialLat = 0;
  private inicialLng = 0;
  private inicialTipoPunto = '';
  private inicialPrioridad: number | null = null;

  readonly isView = computed(() => this.context().mode === 'view');
  readonly isEdit = computed(() => this.context().mode === 'edit');

  readonly tipoPuntoOptions = Object.entries(TIPO_PUNTO_COLECCION_LABELS).map(([value, label]) => ({
    value: value as TipoPuntoColeccionEnum,
    label,
  }));

  readonly form = this.fb.nonNullable.group({
    zonaId: ['', [Validators.required]],
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    direccion: ['', [Validators.required, Validators.maxLength(255)]],
    referencia: ['', [Validators.maxLength(5000)]],
    latitud: [0, [Validators.required]],
    longitud: [0, [Validators.required]],
    tipoPunto: [TipoPuntoColeccionEnum.DOMICILIARIO, [Validators.required]],
    prioridad: this.fb.control<number | null>(null),
  });

  ngOnInit(): void {
    this.zonasService
      .findAll()
      .pipe(
        catchError(() => {
          toast.error('No se pudieron cargar las zonas.');
          return of([] as ZonaRow[]);
        }),
      )
      .subscribe((z) => this.zonas.set(z));

    const ctx = this.context();
    if (ctx.mode === 'create') {
      const { lat, lng } = environment.mapDefaultCenter;
      this.mapLat.set(lat);
      this.mapLng.set(lng);
      this.form.patchValue({
        latitud: lat,
        longitud: lng,
        tipoPunto: TipoPuntoColeccionEnum.DOMICILIARIO,
      });
      this.detalleCargado = true;
      return;
    }

    this.puntosService
      .getById(ctx.puntoId)
      .pipe(
        catchError(() => {
          toast.error('No se pudo cargar el punto de recolección.');
          return of(null);
        }),
      )
      .subscribe((p) => {
        if (!p) {
          return;
        }

        this.inicialZonaId = p.zonaId;
        this.inicialNombre = p.nombre.trim();
        this.inicialDireccion = p.direccion.trim();
        this.inicialReferencia = (p.referencia ?? '').trim();
        this.inicialLat = p.latitud;
        this.inicialLng = p.longitud;
        this.inicialTipoPunto = p.tipoPunto;
        this.inicialPrioridad = p.prioridad;

        this.mapLat.set(p.latitud);
        this.mapLng.set(p.longitud);

        this.form.patchValue({
          zonaId: p.zonaId,
          nombre: p.nombre,
          direccion: p.direccion,
          referencia: p.referencia ?? '',
          latitud: p.latitud,
          longitud: p.longitud,
          tipoPunto: p.tipoPunto as TipoPuntoColeccionEnum,
          prioridad: p.prioridad,
        });

        if (ctx.mode === 'view') {
          this.form.disable({ emitEvent: false });
        }

        this.detalleCargado = true;
      });
  }

  protected onMapPointSelected(ev: MapPointSelectedEvent): void {
    if (this.isView()) {
      return;
    }
    this.mapLat.set(ev.lat);
    this.mapLng.set(ev.lng);
    this.form.patchValue({ latitud: ev.lat, longitud: ev.lng });
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  protected submit(): void {
    if (this.context().mode === 'view') {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      toast.warning('Revisa los campos del formulario.');
      return;
    }

    const ctx = this.context();

    if (ctx.mode === 'create') {
      const raw = this.form.getRawValue();
      const body: CreatePuntoRecoleccionRequest = {
        zonaId: raw.zonaId,
        nombre: raw.nombre.trim(),
        direccion: raw.direccion.trim(),
        latitud: raw.latitud,
        longitud: raw.longitud,
        tipoPunto: raw.tipoPunto,
      };
      const ref = raw.referencia.trim();
      if (ref) {
        body.referencia = ref;
      }
      if (raw.prioridad != null) {
        body.prioridad = raw.prioridad;
      }

      this.loadingService.setLoading(true);
      this.puntosService
        .create(body)
        .pipe(
          catchError(() => {
            toast.error('No se pudo crear el punto de recolección.');
            return EMPTY;
          }),
          finalize(() => this.loadingService.setLoading(false)),
        )
        .subscribe(() => {
          toast.success('Punto de recolección creado correctamente.');
          this.saved.emit();
        });
      return;
    }

    if (ctx.mode !== 'edit') {
      return;
    }

    if (!this.detalleCargado) {
      toast.warning('Espera a que terminen de cargar los datos.');
      return;
    }

    const raw = this.form.getRawValue();
    const patch: UpdatePuntoRecoleccionRequest = {};

    if (raw.zonaId !== this.inicialZonaId) {
      patch.zonaId = raw.zonaId;
    }
    const nom = raw.nombre.trim();
    if (nom !== this.inicialNombre) {
      patch.nombre = nom;
    }
    const dir = raw.direccion.trim();
    if (dir !== this.inicialDireccion) {
      patch.direccion = dir;
    }
    const ref = raw.referencia.trim();
    if (ref !== this.inicialReferencia) {
      patch.referencia = ref;
    }
    if (raw.latitud !== this.inicialLat) {
      patch.latitud = raw.latitud;
    }
    if (raw.longitud !== this.inicialLng) {
      patch.longitud = raw.longitud;
    }
    if (raw.tipoPunto !== this.inicialTipoPunto) {
      patch.tipoPunto = raw.tipoPunto;
    }
    const pr = raw.prioridad;
    if (pr !== this.inicialPrioridad) {
      patch.prioridad = pr;
    }

    if (Object.keys(patch).length === 0) {
      toast.info('No hay cambios por guardar.');
      return;
    }

    this.loadingService.setLoading(true);
    this.puntosService
      .update(ctx.puntoId, patch)
      .pipe(
        catchError(() => {
          toast.error('No se pudo actualizar el punto de recolección.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success('Punto de recolección actualizado correctamente.');
        this.saved.emit();
      });
  }

  protected fieldInvalid(name: keyof typeof this.form.controls): boolean {
    if (this.isView()) {
      return false;
    }
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }
}

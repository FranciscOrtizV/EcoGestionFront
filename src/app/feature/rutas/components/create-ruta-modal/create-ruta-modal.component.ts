import { NgClass } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize, forkJoin, of } from 'rxjs';
import {
  MapPuntosListaComponent,
  type MapaPuntoMarcador,
} from '../../../../shared/components/map-puntos-lista/map-puntos-lista.component';
import { LoadingService } from '../../../../core/services/loading.service';
import { PuntosRecoleccionService } from '../../../../core/services/puntos-recoleccion.service';
import { RutasService } from '../../../../core/services/rutas.service';
import type { PuntoRecoleccionRow } from '../../../puntosRecoleccion/types';
import { TIPO_RUTA_LABELS } from '../../enums/tipo-ruta.enum';
import type {
  CreateRutaRequest,
  PuntoRutaLineaRequest,
  UpdateRutaRequest,
} from '../../types';

function optionalNonNegativeInteger(control: AbstractControl): ValidationErrors | null {
  const raw = control.value;
  if (raw === null || raw === '' || raw === undefined) {
    return null;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    return { nonNegInt: true };
  }
  return null;
}

@Component({
  selector: 'app-create-ruta-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, MapPuntosListaComponent],
  templateUrl: './create-ruta-modal.component.html',
})
export class CreateRutaModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rutasService = inject(RutasService);
  private readonly puntosService = inject(PuntosRecoleccionService);
  private readonly loadingService = inject(LoadingService);

  /** Si viene definido, el modal opera en modo edición (PATCH). */
  readonly rutaId = input<string | null>(null);

  cancelled = output<void>();
  saved = output<void>();

  /** 1 = formulario, 2 = paradas, 3 = confirmación y POST. */
  protected readonly step = signal<1 | 2 | 3>(1);

  protected readonly editInitialLoading = signal(false);

  protected readonly isEditMode = computed(() => this.rutaId() != null && this.rutaId() !== '');

  /** `estimacionParadaMinutos` por punto de recolección (se conserva al reordenar). */
  private readonly paradaEstimacionMin = new Map<string, number>();

  readonly tipoRutaOptions = Object.entries(TIPO_RUTA_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    codigo: ['', [Validators.maxLength(50)]],
    descripcion: ['', [Validators.maxLength(5000)]],
    tipoRuta: ['', [Validators.maxLength(100)]],
    estimacionDuracionMinutos: [null as number | null, [optionalNonNegativeInteger]],
  });

  /** Puntos activos disponibles (paso 2). */
  protected readonly puntosDisponibles = signal<PuntoRecoleccionRow[]>([]);
  /** IDs en el orden de visita (primera parada primero). */
  protected readonly selectedPuntoIds = signal<string[]>([]);

  protected readonly selectedCount = computed(() => this.selectedPuntoIds().length);

  protected readonly selectedPuntosOrdenados = computed(() => {
    const ids = this.selectedPuntoIds();
    const byId = new Map(this.puntosDisponibles().map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is PuntoRecoleccionRow => !!p);
  });

  /** Marcadores para el mapa de confirmación (paso 3). */
  protected readonly puntosParaMapa = computed<MapaPuntoMarcador[]>(() =>
    this.selectedPuntosOrdenados().map((p, i) => ({
      lat: p.latitud,
      lng: p.longitud,
      orden: i + 1,
      titulo: p.nombre,
      subtitulo: `${p.zonaNombre} · ${p.direccion}`,
    })),
  );

  ngOnInit(): void {
    const id = this.rutaId();
    if (id) {
      this.cargarEdicion(id);
      return;
    }
    this.cargarPuntosDisponibles();
  }

  private cargarEdicion(id: string): void {
    this.editInitialLoading.set(true);
    forkJoin({
      puntos: this.puntosService.findAll().pipe(
        catchError(() => {
          toast.error('No se pudieron cargar los puntos de recolección.');
          return of([] as PuntoRecoleccionRow[]);
        }),
      ),
      ruta: this.rutasService.getById(id).pipe(
        catchError(() => {
          toast.error('No se pudo cargar la ruta.');
          return of(null);
        }),
      ),
    })
      .pipe(finalize(() => this.editInitialLoading.set(false)))
      .subscribe(({ puntos, ruta }) => {
        if (!ruta) {
          this.cancelled.emit();
          return;
        }
        const idsEnRuta = new Set(ruta.puntosLinea.map((l) => l.puntoRecoleccionId));
        const merged = puntos
          .filter((p) => p.isActive || idsEnRuta.has(p.id))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        this.puntosDisponibles.set(merged);

        this.paradaEstimacionMin.clear();
        for (const l of ruta.puntosLinea) {
          if (l.estimacionParadaMinutos !== undefined && l.estimacionParadaMinutos !== null) {
            this.paradaEstimacionMin.set(l.puntoRecoleccionId, l.estimacionParadaMinutos);
          }
        }

        this.form.patchValue({
          nombre: ruta.nombre,
          codigo: ruta.codigo ?? '',
          descripcion: ruta.descripcion ?? '',
          tipoRuta: ruta.tipoRuta ?? '',
          estimacionDuracionMinutos: ruta.estimacionDuracionMinutos,
        });

        const ordenados = [...ruta.puntosLinea].sort((a, b) => a.ordenSecuencia - b.ordenSecuencia);
        this.selectedPuntoIds.set(ordenados.map((l) => l.puntoRecoleccionId));
      });
  }

  private cargarPuntosDisponibles(): void {
    this.puntosService
      .findAll()
      .pipe(
        catchError(() => {
          toast.error('No se pudieron cargar los puntos de recolección.');
          return of([] as PuntoRecoleccionRow[]);
        }),
      )
      .subscribe((list) => {
        const activos = list.filter((p) => p.isActive).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        this.puntosDisponibles.set(activos);
      });
  }

  protected fieldInvalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  protected labelTipoRuta(val: string | null | undefined): string {
    const v = (val ?? '').trim();
    if (!v) {
      return 'Sin especificar';
    }
    return TIPO_RUTA_LABELS[v] ?? v;
  }

  protected textoDuracionResumen(): string {
    const v = this.form.controls.estimacionDuracionMinutos.value;
    if (v === null || v === undefined) {
      return 'No indicada';
    }
    return `${v} min`;
  }

  protected textoDescripcionResumen(): string {
    const t = (this.form.controls.descripcion.value ?? '').trim();
    return t.length > 0 ? t : '—';
  }

  protected textoCodigoResumen(): string {
    const t = (this.form.controls.codigo.value ?? '').trim();
    return t.length > 0 ? t : '—';
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  /** Valida el paso 1 y avanza al paso 2. */
  protected goToStep2(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      toast.error('Revisa los campos del formulario antes de continuar.');
      return;
    }
    this.step.set(2);
  }

  protected backToStep1(): void {
    this.step.set(1);
  }

  /** Desde el paso 2 al 3 (solo confirmación; el POST es en el paso 3). */
  protected goToStep3(): void {
    if (this.form.invalid) {
      toast.error('Los datos del paso 1 ya no son válidos. Vuelve a revisarlos.');
      this.step.set(1);
      return;
    }
    this.step.set(3);
  }

  protected backToStep2(): void {
    this.step.set(2);
  }

  protected isPuntoSelected(id: string): boolean {
    return this.selectedPuntoIds().includes(id);
  }

  protected togglePunto(id: string): void {
    const cur = this.selectedPuntoIds();
    if (cur.includes(id)) {
      this.selectedPuntoIds.set(cur.filter((x) => x !== id));
      return;
    }
    this.selectedPuntoIds.set([...cur, id]);
  }

  protected movePuntoInOrder(index: number, direction: -1 | 1): void {
    const cur = [...this.selectedPuntoIds()];
    const j = index + direction;
    if (j < 0 || j >= cur.length) {
      return;
    }
    [cur[index], cur[j]] = [cur[j], cur[index]];
    this.selectedPuntoIds.set(cur);
  }

  /** POST o PATCH al backend (solo desde el paso 3). */
  protected confirmarYCrear(): void {
    if (this.step() !== 3) {
      return;
    }
    if (this.form.invalid) {
      toast.error('Los datos ya no son válidos. Vuelve al paso 1.');
      this.step.set(1);
      return;
    }

    const editId = this.rutaId();
    if (editId) {
      const body = this.buildUpdatePayload();
      const nombre = body.nombre ?? this.form.controls.nombre.value ?? 'la ruta';
      this.loadingService.setLoading(true);
      this.rutasService
        .update(editId, body)
        .pipe(
          catchError(() => {
            toast.error('No se pudo actualizar la ruta.');
            return EMPTY;
          }),
          finalize(() => this.loadingService.setLoading(false)),
        )
        .subscribe(() => {
          toast.success(`Se actualizó la ruta «${nombre}».`);
          this.saved.emit();
        });
      return;
    }

    const body = this.buildPayload();
    this.loadingService.setLoading(true);
    this.rutasService
      .create(body)
      .pipe(
        catchError(() => {
          toast.error('No se pudo crear la ruta.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success(`Se creó la ruta «${body.nombre}».`);
        this.saved.emit();
      });
  }

  private buildPuntosPayload(): PuntoRutaLineaRequest[] | undefined {
    const ids = this.selectedPuntoIds();
    if (ids.length === 0) {
      return undefined;
    }
    return ids.map((puntoRecoleccionId, i) => {
      const line: PuntoRutaLineaRequest = {
        puntoRecoleccionId,
        ordenSecuencia: i + 1,
      };
      const parada = this.paradaEstimacionMin.get(puntoRecoleccionId);
      if (parada !== undefined) {
        line.estimacionParadaMinutos = parada;
      }
      return line;
    });
  }

  /** Siempre incluye `puntos` (puede ser `[]`) para reflejar el estado actual al editar. */
  private buildUpdatePayload(): UpdateRutaRequest {
    const v = this.form.getRawValue();
    const out: UpdateRutaRequest = {};

    const nombre = (v.nombre ?? '').trim();
    if (nombre) {
      out.nombre = nombre;
    }

    const codigo = v.codigo?.trim();
    if (codigo) {
      out.codigo = codigo;
    }

    const descripcion = v.descripcion?.trim();
    if (descripcion) {
      out.descripcion = descripcion;
    }

    const tipoRuta = v.tipoRuta?.trim();
    if (tipoRuta) {
      out.tipoRuta = tipoRuta;
    }

    if (v.estimacionDuracionMinutos !== null && v.estimacionDuracionMinutos !== undefined) {
      out.estimacionDuracionMinutos = Number(v.estimacionDuracionMinutos);
    }

    const ids = this.selectedPuntoIds();
    if (ids.length === 0) {
      out.puntos = [];
    } else {
      out.puntos = ids.map((puntoRecoleccionId, i) => {
        const line: PuntoRutaLineaRequest = {
          puntoRecoleccionId,
          ordenSecuencia: i + 1,
        };
        const parada = this.paradaEstimacionMin.get(puntoRecoleccionId);
        if (parada !== undefined) {
          line.estimacionParadaMinutos = parada;
        }
        return line;
      });
    }

    return out;
  }

  private buildPayload(): CreateRutaRequest {
    const v = this.form.getRawValue();
    const nombre = (v.nombre ?? '').trim();
    const out: CreateRutaRequest = { nombre };

    const codigo = v.codigo?.trim();
    if (codigo) {
      out.codigo = codigo;
    }

    const descripcion = v.descripcion?.trim();
    if (descripcion) {
      out.descripcion = descripcion;
    }

    const tipoRuta = v.tipoRuta?.trim();
    if (tipoRuta) {
      out.tipoRuta = tipoRuta;
    }

    if (v.estimacionDuracionMinutos !== null && v.estimacionDuracionMinutos !== undefined) {
      out.estimacionDuracionMinutos = Number(v.estimacionDuracionMinutos);
    }

    const puntos = this.buildPuntosPayload();
    if (puntos?.length) {
      out.puntos = puntos;
    }

    return out;
  }
}

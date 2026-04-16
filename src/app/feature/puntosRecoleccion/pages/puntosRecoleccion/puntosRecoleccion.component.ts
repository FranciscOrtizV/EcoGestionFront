import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  DataTableActionButton,
  DataTableActionPayload,
  DataTableComponent,
} from '../../../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { CreatePuntoRecoleccionModalComponent } from '../../components/create-punto-recoleccion-modal/create-punto-recoleccion-modal.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingService } from '../../../../core/services/loading.service';
import { PuntosRecoleccionService } from '../../../../core/services/puntos-recoleccion.service';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize, of } from 'rxjs';
import type { PuntoRecoleccionFormModalContext, PuntoRecoleccionRow } from '../../types';
import { TIPO_PUNTO_COLECCION_LABELS } from '../../enums/tipo-punto-coleccion.enum';

type PuntoPendingConfirm =
  | { mode: 'deshabilitar'; punto: PuntoRecoleccionRow }
  | { mode: 'habilitar'; punto: PuntoRecoleccionRow };

@Component({
  selector: 'app-puntos-recoleccion-page',
  standalone: true,
  imports: [StatCardComponent, DataTableComponent, CreatePuntoRecoleccionModalComponent, ConfirmDialogComponent],
  templateUrl: './puntosRecoleccion.component.html',
  styleUrl: './puntosRecoleccion.component.css',
})
export class PuntosRecoleccionPage implements OnInit {
  private readonly puntosService = inject(PuntosRecoleccionService);
  private readonly loadingService = inject(LoadingService);

  protected readonly formatFechaActualizacion = (iso: string) =>
    new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });

  protected readonly labelTipoPunto = (v: string) => TIPO_PUNTO_COLECCION_LABELS[v as keyof typeof TIPO_PUNTO_COLECCION_LABELS] ?? v;

  readonly tablePageSize = 10;
  readonly puntoTableHeaders = [
    'Nombre',
    'Zona',
    'Dirección',
    'Tipo',
    'Estado',
    'Actualizado',
  ] as const;
  readonly puntoTableColumnClasses = [
    'font-medium',
    '',
    'text-base-content/80 max-w-xs truncate',
    'whitespace-nowrap',
    '',
    'whitespace-nowrap',
  ] as const;

  readonly puntos = signal<PuntoRecoleccionRow[]>([]);
  protected readonly puntoFormModal = signal<PuntoRecoleccionFormModalContext | null>(null);
  protected readonly puntoPendingConfirm = signal<PuntoPendingConfirm | null>(null);

  readonly statTotal = computed(() => this.puntos().length);
  readonly statActivos = computed(() => this.puntos().filter((p) => p.isActive).length);
  readonly statInactivos = computed(() => this.puntos().filter((p) => !p.isActive).length);

  readonly puntoTableRows = computed(() =>
    this.puntos().map((p) => [
      p.nombre,
      p.zonaNombre,
      p.direccion,
      this.labelTipoPunto(p.tipoPunto),
      p.isActive ? 'Activa' : 'Inactiva',
      this.formatFechaActualizacion(p.updatedAt),
    ]),
  );

  readonly puntosForTableActions = computed(() => this.puntos());

  readonly puntoTableActionsForRow = (row: unknown): readonly DataTableActionButton[] => {
    const p = row as PuntoRecoleccionRow;
    const base: DataTableActionButton[] = [
      { id: 'ver', iconClass: 'ri-eye-line', label: 'Ver punto', title: 'Ver' },
    ];
    if (p.isActive) {
      base.push(
        { id: 'editar', iconClass: 'ri-pencil-line', label: 'Editar punto', title: 'Editar' },
        {
          id: 'deshabilitar',
          iconClass: 'ri-forbid-line',
          label: 'Deshabilitar punto',
          title: 'Deshabilitar',
          buttonClass: 'text-error',
        },
      );
      return base;
    }
    base.push({
      id: 'habilitar',
      iconClass: 'ri-restart-line',
      label: 'Habilitar punto',
      title: 'Habilitar',
      buttonClass: 'text-success',
    });
    return base;
  };

  ngOnInit(): void {
    this.cargarPuntos();
  }

  cargarPuntos(): void {
    this.loadingService.setLoading(true);
    this.puntosService
      .findAll()
      .pipe(
        catchError(() => {
          toast.error('No se pudo cargar el listado de puntos de recolección.');
          return of([] as PuntoRecoleccionRow[]);
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe((list) => this.puntos.set(list));
  }

  protected openCreateModal(): void {
    this.puntoFormModal.set({ mode: 'create' });
  }

  protected closePuntoFormModal(): void {
    this.puntoFormModal.set(null);
  }

  protected onPuntoSaved(): void {
    this.puntoFormModal.set(null);
    this.cargarPuntos();
  }

  protected onPuntoTableAction(event: DataTableActionPayload): void {
    const p = event.row as PuntoRecoleccionRow;
    const byId: Record<string, (r: PuntoRecoleccionRow) => void> = {
      ver: (r) => this.puntoFormModal.set({ mode: 'view', puntoId: r.id }),
      editar: (r) => this.puntoFormModal.set({ mode: 'edit', puntoId: r.id }),
      deshabilitar: (r) => this.puntoPendingConfirm.set({ mode: 'deshabilitar', punto: r }),
      habilitar: (r) => this.puntoPendingConfirm.set({ mode: 'habilitar', punto: r }),
    };
    byId[event.actionId]?.(p);
  }

  protected cancelPuntoConfirm(): void {
    this.puntoPendingConfirm.set(null);
  }

  protected confirmPuntoEstado(): void {
    const ctx = this.puntoPendingConfirm();
    if (!ctx) {
      return;
    }

    const nombre = ctx.punto.nombre.trim();

    if (ctx.mode === 'deshabilitar') {
      this.loadingService.setLoading(true);
      this.puntosService
        .deshabilitar(ctx.punto.id)
        .pipe(
          catchError(() => {
            toast.error('No se pudo deshabilitar el punto.');
            return EMPTY;
          }),
          finalize(() => this.loadingService.setLoading(false)),
        )
        .subscribe(() => {
          toast.success(`Se deshabilitó «${nombre}».`);
          this.puntoPendingConfirm.set(null);
          this.cargarPuntos();
        });
      return;
    }

    this.loadingService.setLoading(true);
    this.puntosService
      .rehabilitar(ctx.punto.id)
      .pipe(
        catchError(() => {
          toast.error('No se pudo habilitar el punto.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success(`Se habilitó «${nombre}».`);
        this.puntoPendingConfirm.set(null);
        this.cargarPuntos();
      });
  }
}

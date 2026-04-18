import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  DataTableComponent,
  type DataTableActionButton,
  type DataTableActionPayload,
} from '../../../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { CreateRutaModalComponent } from '../../components/create-ruta-modal/create-ruta-modal.component';
import { VerRutaDetalleModalComponent } from '../../components/ver-ruta-detalle-modal/ver-ruta-detalle-modal.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingService } from '../../../../core/services/loading.service';
import { RutasService } from '../../../../core/services/rutas.service';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize, of } from 'rxjs';
import type { RutaRow } from '../../types';
import { TIPO_RUTA_LABELS } from '../../enums/tipo-ruta.enum';

type RutaPendingConfirm =
  | { mode: 'deshabilitar'; ruta: RutaRow }
  | { mode: 'habilitar'; ruta: RutaRow };

@Component({
  selector: 'app-rutas-page',
  standalone: true,
  imports: [
    StatCardComponent,
    DataTableComponent,
    CreateRutaModalComponent,
    VerRutaDetalleModalComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './rutas.component.html',
  styleUrl: './rutas.component.css',
})
export class RutasPage implements OnInit {
  private readonly rutasService = inject(RutasService);
  private readonly loadingService = inject(LoadingService);

  protected readonly formatFechaActualizacion = (iso: string) =>
    new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });

  protected readonly labelTipoRuta = (v: string) => TIPO_RUTA_LABELS[v] ?? v;

  readonly tablePageSize = 10;
  readonly rutaTableHeaders = [
    'Código',
    'Nombre',
    'Tipo',
    'Duración (min)',
    'Paradas',
    'Itinerario',
    'Estado',
    'Actualizado',
  ] as const;
  readonly rutaTableColumnClasses = [
    'whitespace-nowrap font-mono text-sm',
    'font-medium',
    'whitespace-nowrap',
    'whitespace-nowrap text-end',
    'whitespace-nowrap text-end',
    'text-base-content/80 max-w-md truncate',
    '',
    'whitespace-nowrap',
  ] as const;

  readonly rutas = signal<RutaRow[]>([]);
  protected readonly createModalOpen = signal(false);
  protected readonly editingRutaId = signal<string | null>(null);
  protected readonly viewingRutaId = signal<string | null>(null);
  protected readonly rutaPendingConfirm = signal<RutaPendingConfirm | null>(null);

  readonly statTotal = computed(() => this.rutas().length);
  readonly statActivas = computed(() => this.rutas().filter((r) => r.isActive).length);
  readonly statInactivas = computed(() => this.rutas().filter((r) => !r.isActive).length);

  readonly rutaTableRows = computed(() =>
    this.rutas().map((r) => [
      r.codigo,
      r.nombre,
      this.labelTipoRuta(r.tipoRuta),
      r.estimacionDuracionMinutos,
      r.paradasCount,
      r.paradasResumen,
      r.isActive ? 'Activa' : 'Inactiva',
      this.formatFechaActualizacion(r.updatedAt),
    ]),
  );

  readonly rutasForTableActions = computed(() => this.rutas());

  readonly rutaTableActionsForRow = (row: unknown): readonly DataTableActionButton[] => {
    const r = row as RutaRow;
    const base: DataTableActionButton[] = [
      { id: 'ver', iconClass: 'ri-eye-line', label: 'Ver detalle de la ruta', title: 'Ver' },
      { id: 'edit', iconClass: 'ri-pencil-line', label: 'Editar ruta', title: 'Editar' },
    ];
    if (r.isActive) {
      base.push({
        id: 'deshabilitar',
        iconClass: 'ri-forbid-line',
        label: 'Deshabilitar ruta',
        title: 'Deshabilitar',
        buttonClass: 'text-error',
      });
      return base;
    }
    base.push({
      id: 'habilitar',
      iconClass: 'ri-restart-line',
      label: 'Rehabilitar ruta',
      title: 'Rehabilitar',
      buttonClass: 'text-success',
    });
    return base;
  };

  ngOnInit(): void {
    this.cargarRutas();
  }

  cargarRutas(): void {
    this.loadingService.setLoading(true);
    this.rutasService
      .findAll()
      .pipe(
        catchError(() => {
          toast.error('No se pudo cargar el listado de rutas.');
          return of([] as RutaRow[]);
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe((list) => this.rutas.set(list));
  }

  protected openCreateModal(): void {
    this.createModalOpen.set(true);
  }

  protected closeCreateModal(): void {
    this.createModalOpen.set(false);
  }

  protected onRutaCreated(): void {
    this.createModalOpen.set(false);
    this.cargarRutas();
  }

  protected onRutaTableAction(payload: DataTableActionPayload): void {
    const r = payload.row as RutaRow;
    const byId: Record<string, (row: RutaRow) => void> = {
      ver: (row) => this.viewingRutaId.set(row.id),
      edit: (row) => this.editingRutaId.set(row.id),
      deshabilitar: (row) => this.rutaPendingConfirm.set({ mode: 'deshabilitar', ruta: row }),
      habilitar: (row) => this.rutaPendingConfirm.set({ mode: 'habilitar', ruta: row }),
    };
    byId[payload.actionId]?.(r);
  }

  protected cancelRutaConfirm(): void {
    this.rutaPendingConfirm.set(null);
  }

  protected confirmRutaEstado(): void {
    const ctx = this.rutaPendingConfirm();
    if (!ctx) {
      return;
    }
    const nombre = ctx.ruta.nombre.trim();

    if (ctx.mode === 'deshabilitar') {
      this.loadingService.setLoading(true);
      this.rutasService
        .deshabilitar(ctx.ruta.id)
        .pipe(
          catchError(() => {
            toast.error('No se pudo deshabilitar la ruta.');
            return EMPTY;
          }),
          finalize(() => this.loadingService.setLoading(false)),
        )
        .subscribe(() => {
          toast.success(`Se deshabilitó la ruta «${nombre}».`);
          this.rutaPendingConfirm.set(null);
          this.cargarRutas();
        });
      return;
    }

    this.loadingService.setLoading(true);
    this.rutasService
      .rehabilitar(ctx.ruta.id)
      .pipe(
        catchError(() => {
          toast.error('No se pudo rehabilitar la ruta.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success(`Se rehabilitó la ruta «${nombre}».`);
        this.rutaPendingConfirm.set(null);
        this.cargarRutas();
      });
  }

  protected closeEditModal(): void {
    this.editingRutaId.set(null);
  }

  protected closeVerDetalleModal(): void {
    this.viewingRutaId.set(null);
  }

  protected onRutaUpdated(): void {
    this.editingRutaId.set(null);
    this.cargarRutas();
  }
}

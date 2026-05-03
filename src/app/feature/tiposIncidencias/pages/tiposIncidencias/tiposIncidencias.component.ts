import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  DataTableActionButton,
  DataTableActionPayload,
  DataTableComponent,
} from '../../../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { LoadingService } from '../../../../core/services/loading.service';
import { TiposIncidenciasService } from '../../../../core/services/tiposIncidencias.service';
import { toast } from 'ngx-sonner';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CreateTipoIncidenciaModalComponent } from '../../components/create-tipo-incidencia-modal/create-tipo-incidencia-modal.component';
import type { TipoIncidenciaFormModalContext, TipoIncidenciaRow } from '../../types';
import { formatNombreParaTabla } from '../../utils/formatNombreDisplay';
import { catchError, EMPTY, finalize, of } from 'rxjs';

type TipoIncidenciaPendingConfirm =
  | { mode: 'eliminar'; tipo: TipoIncidenciaRow }
  | { mode: 'rehabilitar'; tipo: TipoIncidenciaRow };

@Component({
  selector: 'app-tipos-incidencias-page',
  standalone: true,
  imports: [
    ConfirmDialogComponent,
    CreateTipoIncidenciaModalComponent,
    StatCardComponent,
    DataTableComponent,
  ],
  templateUrl: './tiposIncidencias.component.html',
  styleUrl: './tiposIncidencias.component.css',
})
export class TiposIncidenciasPage implements OnInit {
  private readonly tiposIncidenciasService = inject(TiposIncidenciasService);
  private readonly loadingService = inject(LoadingService);

  protected readonly formatNombreParaTabla = formatNombreParaTabla;

  protected readonly tipoFormModal = signal<TipoIncidenciaFormModalContext | null>(null);
  protected readonly tipoPendingConfirm = signal<TipoIncidenciaPendingConfirm | null>(null);

  readonly tablePageSize = 10;
  readonly tipoTableHeaders = ['Nombre', 'Descripción', 'Estado'] as const;
  readonly tipoTableColumnClasses = ['font-medium', 'text-base-content/70', ''] as const;

  readonly tipos = signal<TipoIncidenciaRow[]>([]);

  readonly statTotal = computed(() => this.tipos().length);
  readonly statActivos = computed(() => this.tipos().filter((t) => t.isActive).length);
  readonly statInactivos = computed(() => this.tipos().filter((t) => !t.isActive).length);

  readonly tipoTableRows = computed(() =>
    this.tipos().map((t) => [
      formatNombreParaTabla(t.nombre),
      t.descripcion,
      t.isActive ? 'Activo' : 'Inactivo',
    ]),
  );

  readonly tiposForTableActions = computed(() => this.tipos());

  readonly tipoTableActionsForRow = (row: unknown): readonly DataTableActionButton[] => {
    const t = row as TipoIncidenciaRow;
    const base: DataTableActionButton[] = [
      { id: 'ver', iconClass: 'ri-eye-line', label: 'Ver tipo', title: 'Ver' },
    ];
    if (t.isActive) {
      base.push(
        { id: 'editar', iconClass: 'ri-pencil-line', label: 'Editar tipo', title: 'Editar' },
        {
          id: 'eliminar',
          iconClass: 'ri-delete-bin-line',
          label: 'Eliminar tipo',
          title: 'Eliminar',
          buttonClass: 'text-error',
        },
      );
    } else {
      base.push({
        id: 'rehabilitar',
        iconClass: 'ri-restart-line',
        label: 'Reactivar tipo',
        title: 'Reactivar',
        buttonClass: 'text-success',
      });
    }
    return base;
  };

  ngOnInit(): void {
    this.loadTiposIncidencias();
  }

  loadTiposIncidencias(): void {
    this.loadingService.setLoading(true);
    this.tiposIncidenciasService
      .getTiposIncidencias()
      .pipe(
        catchError(() => {
          toast.error('Ocurrió un error al intentar obtener los tipos de incidencia');
          return of([] as TipoIncidenciaRow[]);
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe((list) => this.tipos.set(list));
  }

  onTipoTableAction(event: DataTableActionPayload): void {
    const row = event.row as TipoIncidenciaRow;
    const byId: Record<string, (r: TipoIncidenciaRow) => void> = {
      ver: (r) => this.tipoFormModal.set({ mode: 'view', tipoIncidenciaId: r.id }),
      editar: (r) => this.tipoFormModal.set({ mode: 'edit', tipoIncidenciaId: r.id }),
      eliminar: (r) => this.tipoPendingConfirm.set({ mode: 'eliminar', tipo: r }),
      rehabilitar: (r) => this.tipoPendingConfirm.set({ mode: 'rehabilitar', tipo: r }),
    };
    byId[event.actionId]?.(row);
  }

  protected cancelTipoConfirm(): void {
    this.tipoPendingConfirm.set(null);
  }


  protected confirmTipoAction(): void {
    const ctx = this.tipoPendingConfirm();
    if (!ctx) return;

    const nombre = formatNombreParaTabla(ctx.tipo.nombre);

    if (ctx.mode === 'eliminar') {
      this.loadingService.setLoading(true);
      this.tiposIncidenciasService
        .removeTipoIncidencia(ctx.tipo.id)
        .pipe(
          catchError(() => {
            toast.error('No se pudo eliminar el tipo de incidencia.');
            return EMPTY;
          }),
          finalize(() => this.loadingService.setLoading(false)),
        )
        .subscribe(() => {
          toast.success(`Se eliminó «${nombre}».`);
          this.tipoPendingConfirm.set(null);
          this.loadTiposIncidencias();
        });
      return;
    }

    this.loadingService.setLoading(true);
    this.tiposIncidenciasService
      .rehabilitarTipoIncidencia(ctx.tipo.id)
      .pipe(
        catchError(() => {
          toast.error('No se pudo reactivar el tipo de incidencia.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success(`Se reactivó «${nombre}».`);
        this.tipoPendingConfirm.set(null);
        this.loadTiposIncidencias();
      });
  }

  protected openCreateTipoModal(): void {
    this.tipoFormModal.set({ mode: 'create' });
  }

  protected closeTipoFormModal(): void {
    this.tipoFormModal.set(null);
  }

  protected onTipoSaved(): void {
    this.tipoFormModal.set(null);
    this.loadTiposIncidencias();
  }
}

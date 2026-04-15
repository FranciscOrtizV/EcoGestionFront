import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  DataTableActionButton,
  DataTableActionPayload,
  DataTableComponent,
} from '../../../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { CreateZonaModalComponent } from '../../components/create-zona-modal/create-zona-modal.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingService } from '../../../../core/services/loading.service';
import { ZonasService } from '../../../../core/services/zonas.service';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize, of } from 'rxjs';
import type { ZonaFormModalContext, ZonaRow } from '../../types';

type ZonaPendingConfirm =
  | { mode: 'deshabilitar'; zona: ZonaRow }
  | { mode: 'habilitar'; zona: ZonaRow };

@Component({
  selector: 'app-zonas-page',
  standalone: true,
  imports: [StatCardComponent, DataTableComponent, CreateZonaModalComponent, ConfirmDialogComponent],
  templateUrl: './zonas.component.html',
  styleUrl: './zonas.component.css',
})
export class ZonasPage implements OnInit {
  private readonly zonasService = inject(ZonasService);
  private readonly loadingService = inject(LoadingService);

  protected readonly formatFechaActualizacion = (iso: string) =>
    new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });

  readonly tablePageSize = 10;
  readonly zonaTableHeaders = ['Nombre', 'Código', 'Descripción', 'Estado', 'Actualizado'] as const;
  readonly zonaTableColumnClasses = ['font-medium', '', 'text-base-content/80 max-w-md', '', 'whitespace-nowrap'] as const;

  readonly zonas = signal<ZonaRow[]>([]);
  protected readonly zonaFormModal = signal<ZonaFormModalContext | null>(null);
  protected readonly zonaPendingConfirm = signal<ZonaPendingConfirm | null>(null);

  readonly statTotal = computed(() => this.zonas().length);
  readonly statActivas = computed(() => this.zonas().filter((z) => z.isActive).length);
  readonly statInactivas = computed(() => this.zonas().filter((z) => !z.isActive).length);

  readonly zonaTableRows = computed(() =>
    this.zonas().map((z) => [
      z.nombre,
      z.codigo ?? '—',
      z.descripcion,
      z.isActive ? 'Activa' : 'Inactiva',
      this.formatFechaActualizacion(z.updatedAt),
    ]),
  );

  readonly zonasForTableActions = computed(() => this.zonas());

  readonly zonaTableActionsForRow = (row: unknown): readonly DataTableActionButton[] => {
    const z = row as ZonaRow;
    const base: DataTableActionButton[] = [
      { id: 'ver', iconClass: 'ri-eye-line', label: 'Ver zona', title: 'Ver' },
    ];
    if (z.isActive) {
      base.push(
        { id: 'editar', iconClass: 'ri-pencil-line', label: 'Editar zona', title: 'Editar' },
        {
          id: 'deshabilitar',
          iconClass: 'ri-forbid-line',
          label: 'Deshabilitar zona',
          title: 'Deshabilitar',
          buttonClass: 'text-error',
        },
      );
      return base;
    }
    base.push({
      id: 'habilitar',
      iconClass: 'ri-restart-line',
      label: 'Habilitar zona',
      title: 'Habilitar',
      buttonClass: 'text-success',
    });
    return base;
  };

  ngOnInit(): void {
    this.cargarZonas();
  }

  cargarZonas(): void {
    this.loadingService.setLoading(true);
    this.zonasService
      .findAll()
      .pipe(
        catchError(() => {
          toast.error('No se pudo cargar el listado de zonas.');
          return of([] as ZonaRow[]);
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe((list) => this.zonas.set(list));
  }

  protected openCreateModal(): void {
    this.zonaFormModal.set({ mode: 'create' });
  }

  protected closeZonaFormModal(): void {
    this.zonaFormModal.set(null);
  }

  protected onZonaSaved(): void {
    this.zonaFormModal.set(null);
    this.cargarZonas();
  }

  protected onZonaTableAction(event: DataTableActionPayload): void {
    const z = event.row as ZonaRow;
    const byId: Record<string, (r: ZonaRow) => void> = {
      ver: (r) => this.zonaFormModal.set({ mode: 'view', zonaId: r.id }),
      editar: (r) => this.zonaFormModal.set({ mode: 'edit', zonaId: r.id }),
      deshabilitar: (r) => this.zonaPendingConfirm.set({ mode: 'deshabilitar', zona: r }),
      habilitar: (r) => this.zonaPendingConfirm.set({ mode: 'habilitar', zona: r }),
    };
    byId[event.actionId]?.(z);
  }

  protected cancelZonaConfirm(): void {
    this.zonaPendingConfirm.set(null);
  }

  protected confirmZonaEstado(): void {
    const ctx = this.zonaPendingConfirm();
    if (!ctx) return;

    const nombre = ctx.zona.nombre.trim();

    if (ctx.mode === 'deshabilitar') {
      this.loadingService.setLoading(true);
      this.zonasService
        .deshabilitarZona(ctx.zona.id)
        .pipe(
          catchError(() => {
            toast.error('No se pudo deshabilitar la zona.');
            return EMPTY;
          }),
          finalize(() => this.loadingService.setLoading(false)),
        )
        .subscribe(() => {
          toast.success(`Se deshabilitó «${nombre}».`);
          this.zonaPendingConfirm.set(null);
          this.cargarZonas();
        });
      return;
    }

    this.loadingService.setLoading(true);
    this.zonasService
      .rehabilitarZona(ctx.zona.id)
      .pipe(
        catchError(() => {
          toast.error('No se pudo habilitar la zona.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success(`Se habilitó «${nombre}».`);
        this.zonaPendingConfirm.set(null);
        this.cargarZonas();
      });
  }
}

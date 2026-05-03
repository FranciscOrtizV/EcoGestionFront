import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, EMPTY, finalize, of } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AsignacionRutasService } from '../../../../core/services/asignacion-rutas.service';
import { LoadingService } from '../../../../core/services/loading.service';
import {
  DataTableComponent,
  type DataTableActionButton,
  type DataTableActionPayload,
} from '../../../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { CreateAsignacionRutaModalComponent } from '../../components/create-asignacion-ruta-modal/create-asignacion-ruta-modal.component';
import { VerAsignacionRutaDetalleModalComponent } from '../../components/ver-asignacion-ruta-detalle-modal/ver-asignacion-ruta-detalle-modal.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import type { AsignacionRutaRow } from '../../types';

@Component({
  selector: 'app-rutas-diarias-page',
  standalone: true,
  imports: [
    FormsModule,
    StatCardComponent,
    DataTableComponent,
    CreateAsignacionRutaModalComponent,
    VerAsignacionRutaDetalleModalComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './rutas-diarias.component.html',
  styleUrl: './rutas-diarias.component.css',
})
export class RutasDiariasPage implements OnInit {
  private readonly asignacionRutasService = inject(AsignacionRutasService);
  private readonly loadingService = inject(LoadingService);

  protected fechaInicio = '';
  protected fechaFin = '';
  protected readonly createModalOpen = signal(false);
  protected readonly editingAsignacionId = signal<string | null>(null);
  protected readonly viewingAsignacionId = signal<string | null>(null);
  protected readonly asignacionPendingPublicar = signal<AsignacionRutaRow | null>(null);
  readonly tablePageSize = 10;
  readonly asignaciones = signal<AsignacionRutaRow[]>([]);

  readonly rutaTableHeaders = [
    'Nombre ruta',
    'Estado',
    'Conductor',
    'Vehículo',
    'Estado',
    'Turno',
    'Planificación inicio',
    'Planificación fin',
  ] as const;

  readonly rutaTableColumnClasses = [
    'font-medium',
    'whitespace-nowrap',
    'max-w-xs truncate',
    'max-w-xs truncate',
    'whitespace-nowrap',
    'whitespace-nowrap',
    'whitespace-nowrap',
    'whitespace-nowrap',
    'whitespace-nowrap',
  ] as const;

  readonly statTotal = computed(() => this.asignaciones().length);
  readonly statCompletadas = computed(
    () => this.asignaciones().filter((a) => a.estado === 'COMPLETADO').length,
  );
  readonly statEnProceso = computed(
    () => this.asignaciones().filter((a) => a.estado === 'EN_PROCESO').length,
  );

  readonly rutaTableRows = computed(() =>
    this.asignaciones().map((a) => [
      a.rutaNombre,
      a.estado,
      a.conductorNombre,
      a.vehiculoNombre,
      a.estado,
      a.turno,
      a.planificacionInicio,
      a.planificacionFin,
    ]),
  );

  readonly asignacionesForTableActions = computed(() => this.asignaciones());

  readonly asignacionTableActionsForRow = (row: unknown): readonly DataTableActionButton[] => {
    const a = row as AsignacionRutaRow;
    const buttons: DataTableActionButton[] = [
      {
        id: 'ver',
        iconClass: 'ri-eye-line',
        label: 'Ver detalle de la asignación',
        title: 'Ver',
      },
    ];
    if (a.estado === 'BORRADOR') {
      buttons.push({
        id: 'edit',
        iconClass: 'ri-pencil-line',
        label: 'Editar asignación',
        title: 'Editar',
      });
      buttons.push({
        id: 'publicar',
        iconClass: 'ri-upload-cloud-2-line',
        label: 'Publicar asignación',
        title: 'Publicar',
        buttonClass: 'text-primary',
      });
    }
    return buttons;
  };

  ngOnInit(): void {
    this.resetearRangoActual();
  }

  protected buscarPorRango(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      toast.error('Debe ingresar fecha de inicio y fecha de fin.');
      return;
    }
    if (this.fechaInicio > this.fechaFin) {
      toast.error('La fecha de inicio no puede ser mayor que la fecha de fin.');
      return;
    }

    this.loadingService.setLoading(true);
    this.asignacionRutasService
      .findByRangoFechas(this.fechaInicio, this.fechaFin)
      .pipe(
        catchError(() => {
          toast.error('No se pudo cargar el listado de rutas diarias para el rango indicado.');
          return of([] as AsignacionRutaRow[]);
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe((list) => this.asignaciones.set(list));
  }

  protected resetearRangoActual(): void {
    const hoy = new Date();
    const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.fechaInicio = this.toInputDate(inicioMesActual);
    this.fechaFin = this.toInputDate(hoy);
    this.buscarPorRango();
  }

  protected openCreateModal(): void {
    this.createModalOpen.set(true);
  }

  protected closeCreateModal(): void {
    this.createModalOpen.set(false);
  }

  protected onAsignacionCreated(): void {
    this.createModalOpen.set(false);
    this.buscarPorRango();
  }

  protected onAsignacionTableAction(payload: DataTableActionPayload): void {
    const row = payload.row as AsignacionRutaRow;
    if (payload.actionId === 'ver') {
      this.viewingAsignacionId.set(row.id);
      return;
    }
    if (payload.actionId === 'edit') {
      this.editingAsignacionId.set(row.id);
      return;
    }
    if (payload.actionId !== 'publicar') {
      return;
    }
    if (row.estado !== 'BORRADOR') {
      return;
    }

    this.asignacionPendingPublicar.set(row);
  }

  protected cancelPublicarConfirm(): void {
    this.asignacionPendingPublicar.set(null);
  }

  protected confirmPublicar(): void {
    const row = this.asignacionPendingPublicar();
    if (!row || row.estado !== 'BORRADOR') {
      this.asignacionPendingPublicar.set(null);
      return;
    }

    this.loadingService.setLoading(true);
    this.asignacionRutasService
      .publicar(row.id)
      .pipe(
        catchError(() => {
          toast.error('No se pudo publicar la asignación.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        this.asignacionPendingPublicar.set(null);
        toast.success('Asignación publicada correctamente.');
        this.buscarPorRango();
      });
  }

  protected closeVerDetalleModal(): void {
    this.viewingAsignacionId.set(null);
  }

  protected closeEditModal(): void {
    this.editingAsignacionId.set(null);
  }

  protected onAsignacionUpdated(): void {
    this.editingAsignacionId.set(null);
    this.buscarPorRango();
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

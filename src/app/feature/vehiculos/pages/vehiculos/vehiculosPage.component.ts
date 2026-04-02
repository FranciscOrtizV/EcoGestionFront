import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  DataTableActionButton,
  DataTableActionPayload,
  DataTableBadgeColumn,
  DataTableComponent,
} from '../../../../shared/components/data-table/data-table.component';
import { CreateVehiculoModalComponent } from '../../components/create-vehiculo-modal/create-vehiculo-modal.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import type { VehiculoFormModalContext } from '../../types';
import { VehiculoRow } from '../../types/index';
import { EstadoVehiculoEnum } from '../../../../shared/enums';
import { LoadingService } from '../../../../core/services/loading.service';
import { VehiculosService } from '../../../../core/services/vehiculos.service';
import { catchError, finalize, of } from 'rxjs';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-vehiculos-page',
  standalone: true,
  imports: [CreateVehiculoModalComponent, StatCardComponent, DataTableComponent],
  templateUrl: './vehiculosPage.component.html',
  styleUrl: './vehiculosPage.component.css',
})
export class VehiculosPage implements OnInit {

  private readonly vehiculoService = inject(VehiculosService);
  private readonly loadingService = inject(LoadingService);

  protected readonly vehiculoFormModal = signal<VehiculoFormModalContext | null>(null);

  readonly vehiculoTableColumnClasses = ['font-medium', 'text-base-content/70', '', '', ''] as const;
  readonly vehiculos = signal<VehiculoRow[]>([]);
  readonly tablePageSize = 10;
  readonly vehiculoTableHeaders = ['Patente', 'Codigo interno', 'Marca', 'Modelo', 'Estado'] as const;
  readonly vehiculoTableRows = computed(() =>
    this.vehiculos().map((v) => [
      v.patente,
      v.codigoInterno,
      v.marca,
      v.modelo,
      labelEstadoVehiculo(v.estado),
    ]),
  );

  /** Clases DaisyUI para la columna estado (coinciden con `labelEstadoVehiculo`). */
  protected estadoBadgeClass(cell: string): string {
    switch (cell) {
      case 'Disponible':
        return 'badge-success';
      case 'En mantención':
        return 'badge-warning';
      case 'Fuera de servicio':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  }

  /** Objeto tipado para `badgeColumn` (evita que el template infiera solo `{ index, successWhen }`). */
  readonly vehiculoBadgeColumn: DataTableBadgeColumn = {
    index: 4,
    badgeClass: (cell: string) => this.estadoBadgeClass(cell),
  };

  readonly statTotal = computed(() => this.vehiculos().length);
  readonly statDisponibles = computed(() => this.vehiculos().filter((v) => v.estado === EstadoVehiculoEnum.DISPONIBLE).length);
  readonly statEnMantencion = computed(() => this.vehiculos().filter((v) => v.estado === EstadoVehiculoEnum.EN_MANTENCION).length);
  readonly statFueraDeServicio = computed(() => this.vehiculos().filter((v) => v.estado === EstadoVehiculoEnum.FUERA_DE_SERVICIO).length);
  readonly vehiculosForTableActions = computed(() => this.vehiculos());

  readonly vehiculoTableActionsForRow = (row: unknown): readonly DataTableActionButton[] => {
    const base: DataTableActionButton[] = [
      { id: 'ver', iconClass: 'ri-eye-line', label: 'Ver vehículo', title: 'Ver' },
      { id: 'editar', iconClass: 'ri-pencil-line', label: 'Editar vehículo', title: 'Editar' },
    ];
    return base;
  };

  ngOnInit(): void {
      this.loadVehiculos();
  }

  loadVehiculos(): void {
    this.loadingService.setLoading(true);
    this.vehiculoService
      .getVehiculos()
      .pipe(
        catchError((err: unknown) => {
          toast.error('Ocurrió un error al intentar obtener la lista de vehículos');
          return of([] as VehiculoRow[]);
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(list => this.vehiculos.set(list));
  }

  onUserTableAction(event: DataTableActionPayload): void {
    const vehiculo = event.row as VehiculoRow;
    const byId: Record<string, (u: VehiculoRow, e: DataTableActionPayload) => void> = {
      ver: (u) => this.onVerVehiculo(u),
      editar: (u) => this.onEditarVehiculo(u),
    };
    byId[event.actionId]?.(vehiculo, event);
  }

  private onVerVehiculo(vehiculo: VehiculoRow): void {
    this.vehiculoFormModal.set({ mode: 'view', vehiculoId: vehiculo.id });
  }

  private onEditarVehiculo(vehiculo: VehiculoRow): void {
    this.vehiculoFormModal.set({ mode: 'edit', vehiculoId: vehiculo.id });
  }

  protected openCreateVehiculoModal(): void {
    this.vehiculoFormModal.set({ mode: 'create' });
  }

  protected closeVehiculoFormModal(): void {
    this.vehiculoFormModal.set(null);
  }

  protected onVehiculoSaved(): void {
    this.vehiculoFormModal.set(null);
    this.loadVehiculos();
  }
}

function labelEstadoVehiculo(estado: string): string {
  switch (estado) {
    case EstadoVehiculoEnum.DISPONIBLE:
      return 'Disponible';
    case EstadoVehiculoEnum.EN_MANTENCION:
      return 'En mantención';
    case EstadoVehiculoEnum.FUERA_DE_SERVICIO:
      return 'Fuera de servicio';
    default:
      return estado;
  }
}

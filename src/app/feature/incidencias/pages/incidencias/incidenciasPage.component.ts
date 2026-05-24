import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toast } from 'ngx-sonner';
import { catchError, finalize, of } from 'rxjs';
import {
  DataTableActionButton,
  DataTableActionPayload,
  DataTableBadgeColumn,
  DataTableComponent,
} from '../../../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { LoadingService } from '../../../../core/services/loading.service';
import { IncidenciasService } from '../../../../core/services/incidencias.service';
import { IncidenciaDetalleSidebarComponent } from '../../components/incidencia-detalle-sidebar/incidencia-detalle-sidebar.component';
import type { IncidenciaListItem } from '../../types';
import {
  estadoIncidenciaBadgeClass,
  formatFechaReporteIncidencia,
  isIncidenciaEstadoAbierto,
  isIncidenciaPrioridadAlta,
  labelEstadoIncidencia,
  labelPrioridadIncidencia,
  puntoIncidenciaLabel,
  rutaIncidenciaLabel,
} from '../../utils/incidencia-display.utils';

@Component({
  selector: 'app-incidencias-page',
  standalone: true,
  imports: [DataTableComponent, StatCardComponent, IncidenciaDetalleSidebarComponent],
  templateUrl: './incidenciasPage.component.html',
  styleUrl: './incidenciasPage.component.css',
})
export class IncidenciasPage implements OnInit {
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly loadingService = inject(LoadingService);

  readonly tablePageSize = 10;
  readonly incidenciaTableHeaders = [
    'Título',
    'Tipo',
    'Ruta',
    'Punto',
    'Reportado por',
    'Prioridad',
    'Estado',
    'Fecha reporte',
  ] as const;
  readonly incidenciaTableColumnClasses = [
    'font-medium max-w-xs',
    '',
    'text-base-content/80',
    'text-base-content/80',
    'text-base-content/80',
    '',
    '',
    'whitespace-nowrap text-base-content/80',
  ] as const;

  readonly incidenciaTableActionsForRow = (): readonly DataTableActionButton[] => [
    { id: 'ver', iconClass: 'ri-eye-line', label: 'Ver incidencia', title: 'Ver' },
  ];

  readonly incidencias = signal<IncidenciaListItem[]>([]);
  protected readonly incidenciaDetalleSidebarId = signal<string | null>(null);

  readonly statTotal = computed(() => this.incidencias().length);
  readonly statAbiertas = computed(() =>
    this.incidencias().filter((i) => isIncidenciaEstadoAbierto(i.estado)).length,
  );
  readonly statPrioridadAlta = computed(() =>
    this.incidencias().filter((i) => isIncidenciaPrioridadAlta(i.prioridad)).length,
  );

  readonly incidenciaTableRows = computed(() =>
    this.incidencias().map((i) => [
      i.titulo,
      i.tipoIncidencia.nombre,
      rutaIncidenciaLabel(i.ruta),
      puntoIncidenciaLabel(i.puntoRecoleccion),
      i.reportadoPor.nombreCompleto,
      labelPrioridadIncidencia(i.prioridad),
      labelEstadoIncidencia(i.estado),
      formatFechaReporteIncidencia(i.fechaReporte),
    ]),
  );

  readonly incidenciasForTableActions = computed(() => this.incidencias());

  readonly estadoBadgeColumn: DataTableBadgeColumn = {
    index: 6,
    badgeClass: (cell: string) => estadoIncidenciaBadgeClass(cell),
  };

  ngOnInit(): void {
    this.loadIncidencias();
  }

  loadIncidencias(): void {
    this.loadingService.setLoading(true);
    this.incidenciasService
      .getAllIncidencias()
      .pipe(
        catchError(() => {
          toast.error('Ocurrió un error al intentar obtener las incidencias');
          return of([] as IncidenciaListItem[]);
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe((list) => this.incidencias.set(list));
  }

  onIncidenciaTableAction(event: DataTableActionPayload): void {
    if (event.actionId !== 'ver') return;
    const inc = event.row as IncidenciaListItem;
    this.incidenciaDetalleSidebarId.set(inc.id);
  }

  protected cerrarDetalleIncidenciaSidebar(): void {
    this.incidenciaDetalleSidebarId.set(null);
  }

  protected onIncidenciaResueltaEnSidebar(): void {
    this.loadIncidencias();
  }
}

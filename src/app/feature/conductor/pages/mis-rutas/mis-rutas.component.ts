import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthService } from '../../../../core/services/auth.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { RutasService } from '../../../../core/services/rutas.service';
import {
  DataTableComponent,
  type DataTableActionButton,
  type DataTableActionPayload,
} from '../../../../shared/components/data-table/data-table.component';
import type { RutaRow } from '../../../rutas/types/rutaRow.type';
import { TIPO_RUTA_LABELS } from '../../../rutas/enums/tipo-ruta.enum';

@Component({
  selector: 'app-conductor-mis-rutas',
  standalone: true,
  imports: [DataTableComponent],
  templateUrl: './mis-rutas.component.html',
  styleUrl: './mis-rutas.component.css'
})
export class ConductorMisRutasComponent implements OnInit {
  private readonly rutasService = inject(RutasService);
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly router = inject(Router);

  readonly rutasAcciones: readonly DataTableActionButton[] = [
    {
      id: 'ver',
      iconClass: 'ri-eye-line',
      label: 'Ver ruta',
      title: 'Ver ruta',
    },
  ];

  protected readonly rutas = signal<RutaRow[]>([]);
  protected readonly loadError = signal(false);
  readonly tablePageSize = 10;

  protected readonly labelTipoRuta = (v: string) => TIPO_RUTA_LABELS[v] ?? v;

  private readonly formatFechaHora = (iso?: string | null): string => {
    if (!iso) {
      return '—';
    }
    return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  };

  readonly rutasTableHeaders = [
    'Nombre',
    'Código',
    'Tipo ruta',
    'Estimación minutos',
    'Estado',
    'Planificación inicio',
    'Planificación fin',
    'Modelo vehículo',
    'Patente',
    'Capacidad (kg)',
  ] as const;
  readonly rutasTableColumnClasses = [
    'font-medium',
    'whitespace-nowrap',
    'whitespace-nowrap',
    'whitespace-nowrap',
    'whitespace-nowrap',
    'whitespace-nowrap',
    'whitespace-nowrap',
    'whitespace-nowrap',
    'whitespace-nowrap font-mono text-sm',
    'whitespace-nowrap text-end',
  ] as const;
  readonly rutasTableRows = computed(() =>
    this.rutas().map((ruta) => [
      ruta.nombre,
      ruta.codigo ?? '—',
      this.labelTipoRuta(ruta.tipoRuta ?? '—'),
      String(ruta.estimacionDuracionMinutos),
      ruta.estado ?? '—',
      this.formatFechaHora(ruta.planificacionTiempoInicio),
      this.formatFechaHora(ruta.planificacionTiempoFin),
      ruta.vehiculoModelo ?? '—',
      ruta.vehiculoPatente ?? '—',
      ruta.vehiculoCapacidadKg ?? '—',
    ]),
  );

  protected onRutaAccion(payload: DataTableActionPayload): void {
    if (payload.actionId !== 'ver') {
      return;
    }
    const row = payload.row as RutaRow;
    void this.router.navigate(['/conductor', 'mis-rutas', row.id]);
  }

  ngOnInit(): void {
    this.cargarMisRutas();
  }

  protected cargarMisRutas(): void {
    this.loadingService.setLoading(true);
    this.loadError.set(false);
    const conductorId = this.authService.currentUser()?.id;
    if (!conductorId) {
      this.loadError.set(true);
      this.loadingService.setLoading(false);
      toast.error('No se pudo identificar el conductor autenticado.');
      return;
    }

    this.rutasService
      .findRutasAsignadas({ conductorId, incluirInactivos: true })
      .pipe(
        catchError(() => {
          this.loadError.set(true);
          toast.error('No se pudo cargar el listado de rutas asignadas.');
          return of([] as RutaRow[]);
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe((list) => this.rutas.set(list));
  }
}

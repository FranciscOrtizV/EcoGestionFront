import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { LoadingService } from '../../../../core/services/loading.service';
import { RutasService } from '../../../../core/services/rutas.service';
import { toast } from 'ngx-sonner';
import { catchError, finalize, of } from 'rxjs';
import type { RutaRow } from '../../types';
import { TIPO_RUTA_LABELS } from '../../enums/tipo-ruta.enum';

@Component({
  selector: 'app-rutas-page',
  standalone: true,
  imports: [StatCardComponent, DataTableComponent],
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
}

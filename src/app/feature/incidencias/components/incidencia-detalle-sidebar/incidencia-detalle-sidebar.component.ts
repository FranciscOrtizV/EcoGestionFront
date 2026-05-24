import { DecimalPipe, NgClass } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { toast } from 'ngx-sonner';
import { catchError, finalize, of } from 'rxjs';
import { IncidenciasService } from '../../../../core/services/incidencias.service';
import {
  MapPuntosListaComponent,
  type MapaPuntoMarcador,
} from '../../../../shared/components/map-puntos-lista/map-puntos-lista.component';
import type { IncidenciaDetalle } from '../../types/incidenciaDetalle.type';
import { ResolverIncidenciaModalComponent } from '../resolver-incidencia-modal/resolver-incidencia-modal.component';
import {
  estadoIncidenciaBadgeClass,
  formatFechaReporteIncidencia,
  incidenciaTieneDatosResolucion,
  isIncidenciaEstadoAbierto,
  labelEstadoIncidencia,
  labelPrioridadIncidencia,
  labelTipoIncidenciaNombre,
  prioridadIncidenciaBadgeClass,
  rutaIncidenciaLabel,
} from '../../utils/incidencia-display.utils';

@Component({
  selector: 'app-incidencia-detalle-sidebar',
  standalone: true,
  imports: [DecimalPipe, NgClass, MapPuntosListaComponent, ResolverIncidenciaModalComponent],
  templateUrl: './incidencia-detalle-sidebar.component.html',
  styleUrl: './incidencia-detalle-sidebar.component.css',
})
export class IncidenciaDetalleSidebarComponent implements OnInit {
  private readonly incidenciasService = inject(IncidenciasService);

  readonly incidenciaId = input.required<string>();

  closed = output<void>();
  incidenciaResuelta = output<void>();

  protected readonly loading = signal(true);
  protected readonly detalle = signal<IncidenciaDetalle | null>(null);
  protected readonly indiceEvidenciaCarrusel = signal(0);
  protected readonly modalResolverAbierto = signal(false);

  protected readonly puedeResolver = computed(() => {
    const d = this.detalle();
    return d ? isIncidenciaEstadoAbierto(d.estado) : false;
  });

  protected readonly tieneResolucion = computed(() => {
    const d = this.detalle();
    return d ? incidenciaTieneDatosResolucion(d) : false;
  });

  protected readonly labelPrioridad = computed(() => {
    const d = this.detalle();
    return d ? labelPrioridadIncidencia(d.prioridad) : '';
  });

  protected readonly labelEstado = computed(() => {
    const d = this.detalle();
    return d ? labelEstadoIncidencia(d.estado) : '';
  });

  protected readonly prioridadBadgeClass = computed(() =>
    prioridadIncidenciaBadgeClass(this.labelPrioridad()),
  );

  protected readonly estadoBadgeClass = computed(() =>
    estadoIncidenciaBadgeClass(this.labelEstado()),
  );

  protected readonly marcadoresMapa = computed<MapaPuntoMarcador[]>(() => {
    const d = this.detalle();
    if (!d || d.latitud === null || d.longitud === null) return [];

    return [
      {
        lat: d.latitud,
        lng: d.longitud,
        orden: 1,
        titulo: d.titulo,
        subtitulo: d.puntoRecoleccion
          ? `${d.puntoRecoleccion.nombre} · ${d.puntoRecoleccion.direccion}`
          : labelTipoIncidenciaNombre(d.tipoIncidencia.nombre),
      },
    ];
  });

  protected readonly tieneCoordenadas = computed(() => this.marcadoresMapa().length > 0);

  protected readonly formatFechaReporteIncidencia = formatFechaReporteIncidencia;
  protected readonly rutaIncidenciaLabel = rutaIncidenciaLabel;
  protected readonly labelTipoIncidenciaNombre = labelTipoIncidenciaNombre;

  ngOnInit(): void {
    this.cargarDetalle();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.modalResolverAbierto()) {
      this.cerrarModalResolver();
      return;
    }
    this.cerrar();
  }

  protected cargarDetalle(): void {
    this.loading.set(true);
    this.incidenciasService
      .getIncidenciaById(this.incidenciaId())
      .pipe(
        catchError(() => {
          toast.error('No se pudo cargar el detalle de la incidencia.');
          return of(null as IncidenciaDetalle | null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((d) => {
        this.detalle.set(d);
        this.indiceEvidenciaCarrusel.set(0);
      });
  }

  protected anteriorEvidencia(total: number, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.indiceEvidenciaCarrusel.update((i) => (i <= 0 ? total - 1 : i - 1));
  }

  protected siguienteEvidencia(total: number, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.indiceEvidenciaCarrusel.update((i) => (i >= total - 1 ? 0 : i + 1));
  }

  protected irAEvidencia(indice: number): void {
    this.indiceEvidenciaCarrusel.set(indice);
  }

  protected abrirModalResolver(): void {
    this.modalResolverAbierto.set(true);
  }

  protected cerrarModalResolver(): void {
    this.modalResolverAbierto.set(false);
  }

  protected onIncidenciaResuelta(): void {
    this.modalResolverAbierto.set(false);
    this.cargarDetalle();
    this.incidenciaResuelta.emit();
  }

  protected cerrar(): void {
    this.closed.emit();
  }
}

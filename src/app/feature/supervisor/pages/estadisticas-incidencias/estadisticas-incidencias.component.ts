import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { toast } from 'ngx-sonner';
import { catchError, finalize, of } from 'rxjs';
import {
  EstadisticasService,
  type MetricasIncidencias,
} from '../../../../core/services/estadisticas.service';
import { LoadingService } from '../../../../core/services/loading.service';
import {
  labelEstadoIncidencia,
  labelPrioridadIncidencia,
  labelTipoIncidenciaNombre,
  normalizeIncidenciaCodigo,
} from '../../../incidencias/utils/incidencia-display.utils';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { PrioridadIncidenciaEnum } from '../../../../shared/enums/PrioridadIncidencia.enum';
import {
  formatFechaCorta,
  formatPorcentajeMetrica,
} from '../../utils/estadisticas-rutas-display.utils';

Chart.register(...registerables);

/** Estados que devuelve el API (`eco-gestion-back`). */
const ESTADOS_ORDEN = ['ABIERTA', 'EN_PROGRESO', 'RESUELTA', 'CERRADA'] as const;

const PRIORIDADES_ORDEN: PrioridadIncidenciaEnum[] = [
  PrioridadIncidenciaEnum.CRITICA,
  PrioridadIncidenciaEnum.ALTA,
  PrioridadIncidenciaEnum.MEDIA,
  PrioridadIncidenciaEnum.BAJA,
];

const ESTADO_CHART_COLORS: Record<string, string> = {
  ABIERTA: 'rgb(250, 204, 21)',
  EN_PROGRESO: 'rgb(59, 130, 246)',
  RESUELTA: 'rgb(34, 197, 94)',
  CERRADA: 'rgb(16, 185, 129)',
};

const PRIORIDAD_CHART_COLORS = [
  'rgb(239, 68, 68)',
  'rgb(251, 146, 60)',
  'rgb(59, 130, 246)',
  'rgb(148, 163, 184)',
];

@Component({
  selector: 'app-supervisor-estadisticas-incidencias',
  standalone: true,
  imports: [FormsModule, StatCardComponent],
  templateUrl: './estadisticas-incidencias.component.html',
  styleUrl: './estadisticas-incidencias.component.css',
})
export class SupervisorEstadisticasIncidenciasComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  private readonly estadisticasService = inject(EstadisticasService);
  private readonly loadingService = inject(LoadingService);

  @ViewChild('estadoChartCanvas') estadoChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('prioridadChartCanvas') prioridadChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('diariasChartCanvas') diariasChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('tipoChartCanvas') tipoChartCanvas?: ElementRef<HTMLCanvasElement>;

  protected fechaInicio = '';
  protected fechaFin = '';
  protected readonly metricas = signal<MetricasIncidencias | null>(null);
  protected readonly sinDatos = signal(false);

  private chartsReady = false;
  private estadoChart?: Chart;
  private prioridadChart?: Chart;
  private diariasChart?: Chart;
  private tipoChart?: Chart;

  ngOnInit(): void {
    this.resetearRangoActual();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
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
    this.estadisticasService
      .obtenerMetricasIncidencias({ desde: this.fechaInicio, hasta: this.fechaFin })
      .pipe(
        catchError(() => {
          toast.error('No se pudieron cargar las estadísticas de incidencias.');
          return of(null);
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe((data) => {
        this.metricas.set(data);
        this.sinDatos.set(data == null);
        this.renderCharts();
      });
  }

  protected resetearRangoActual(): void {
    const hoy = new Date();
    const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.fechaInicio = this.toInputDate(inicioMesActual);
    this.fechaFin = this.toInputDate(hoy);
    this.buscarPorRango();
  }

  protected statTotal(): string | number {
    return this.metricas()?.resumen.totalIncidencias ?? '—';
  }

  protected statPorAtender(): string {
    const r = this.metricas()?.resumen;
    if (!r) return '—';
    const pct = formatPorcentajeMetrica(r.porcentajePorAtender);
    return `${r.porAtender} (${pct})`;
  }

  protected statAtendidas(): string {
    const r = this.metricas()?.resumen;
    if (!r) return '—';
    const pct = formatPorcentajeMetrica(r.porcentajeAtendidas);
    return `${r.atendidas} (${pct})`;
  }

  protected statPrioridadAlta(): string {
    const dist = this.metricas()?.distribucionPorPrioridad;
    if (!dist) return '—';

    const total = this.metricas()?.resumen.totalIncidencias ?? 0;
    const altaCritica =
      this.valorDistribucion(dist, PrioridadIncidenciaEnum.ALTA) +
      this.valorDistribucion(dist, PrioridadIncidenciaEnum.CRITICA);
    const pct =
      total > 0 ? formatPorcentajeMetrica((altaCritica / total) * 100) : '—';
    return `${altaCritica} (${pct})`;
  }

  protected periodoLabel(): string {
    const p = this.metricas()?.periodo;
    if (!p?.desde && !p?.hasta) return '';
    const desde = p.desde ? formatFechaCorta(p.desde) : '—';
    const hasta = p.hasta ? formatFechaCorta(p.hasta) : '—';
    return `${desde} – ${hasta}`;
  }

  private renderCharts(): void {
    if (!this.chartsReady) return;

    const data = this.metricas();
    this.destroyCharts();
    if (!data) return;

    this.renderEstadoChart(data);
    this.renderPrioridadChart(data);
    this.renderDiariasChart(data);
    this.renderTipoChart(data);
  }

  private renderEstadoChart(data: MetricasIncidencias): void {
    const canvas = this.estadoChartCanvas?.nativeElement;
    if (!canvas) return;

    const dist = data.distribucionPorEstado ?? {};
    const entries = ESTADOS_ORDEN.map((estado) => ({
      estado,
      value: this.valorDistribucion(dist, estado),
    })).filter((e) => e.value > 0);

    if (entries.length === 0) return;

    this.estadoChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: entries.map((e) => labelEstadoIncidencia(e.estado)),
        datasets: [
          {
            data: entries.map((e) => e.value),
            backgroundColor: entries.map(
              (e) => ESTADO_CHART_COLORS[e.estado] ?? 'rgb(148, 163, 184)',
            ),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  private renderPrioridadChart(data: MetricasIncidencias): void {
    const canvas = this.prioridadChartCanvas?.nativeElement;
    if (!canvas) return;

    const dist = data.distribucionPorPrioridad ?? {};
    const entries = PRIORIDADES_ORDEN.map((prioridad) => ({
      prioridad,
      label: labelPrioridadIncidencia(prioridad),
      value: this.valorDistribucion(dist, prioridad),
    })).filter((e) => e.value > 0);

    if (entries.length === 0) return;

    this.prioridadChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: entries.map((e) => e.label),
        datasets: [
          {
            label: 'Incidencias',
            data: entries.map((e) => e.value),
            backgroundColor: entries.map(
              (_, i) => PRIORIDAD_CHART_COLORS[i % PRIORIDAD_CHART_COLORS.length],
            ),
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  private renderDiariasChart(data: MetricasIncidencias): void {
    const canvas = this.diariasChartCanvas?.nativeElement;
    if (!canvas) return;

    const puntos = data.incidenciasDiariasReportadas ?? [];
    if (puntos.length === 0) return;

    const labels = puntos.map((p) => formatFechaCorta(p.fecha));
    const values = puntos.map((p) => p.cantidad);

    this.diariasChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Incidencias reportadas',
            data: values,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            fill: true,
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  private renderTipoChart(data: MetricasIncidencias): void {
    const canvas = this.tipoChartCanvas?.nativeElement;
    if (!canvas) return;

    const tipos = [...(data.porTipo ?? [])].sort((a, b) => b.cantidad - a.cantidad);
    if (tipos.length === 0) return;

    const labels = tipos.map((t) => labelTipoIncidenciaNombre(t.tipoNombre));
    const values = tipos.map((t) => t.cantidad);

    this.tipoChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Incidencias',
            data: values,
            backgroundColor: 'rgba(99, 102, 241, 0.75)',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  private valorDistribucion(dist: Record<string, number>, clave: string): number {
    const norm = normalizeIncidenciaCodigo(clave);
    return Object.entries(dist).reduce((sum, [k, v]) => {
      return normalizeIncidenciaCodigo(k) === norm ? sum + (v ?? 0) : sum;
    }, 0);
  }

  private destroyCharts(): void {
    this.estadoChart?.destroy();
    this.prioridadChart?.destroy();
    this.diariasChart?.destroy();
    this.tipoChart?.destroy();
    this.estadoChart = undefined;
    this.prioridadChart = undefined;
    this.diariasChart = undefined;
    this.tipoChart = undefined;
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

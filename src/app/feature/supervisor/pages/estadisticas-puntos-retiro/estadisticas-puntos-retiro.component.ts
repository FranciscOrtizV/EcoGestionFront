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
  type MetricasPuntosRetiro,
} from '../../../../core/services/estadisticas.service';
import { LoadingService } from '../../../../core/services/loading.service';
import {
  TIPO_PUNTO_COLECCION_LABELS,
  TipoPuntoColeccionEnum,
} from '../../../puntosRecoleccion/enums/tipo-punto-coleccion.enum';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { EstadoEjecucionPuntoRutaEnum } from '../../../../shared/enums/EstadoEjecucionPuntoRuta.enum';
import {
  formatFechaCorta,
  formatPorcentajeMetrica,
  labelEstadoEjecucionPunto,
} from '../../utils/estadisticas-rutas-display.utils';

Chart.register(...registerables);

const ESTADOS_ORDEN: EstadoEjecucionPuntoRutaEnum[] = [
  EstadoEjecucionPuntoRutaEnum.COMPLETADO,
  EstadoEjecucionPuntoRutaEnum.PENDIENTE,
  EstadoEjecucionPuntoRutaEnum.SALTADO,
  EstadoEjecucionPuntoRutaEnum.FALLIDO,
];

const ESTADO_CHART_COLORS = [
  'rgb(34, 197, 94)',
  'rgb(148, 163, 184)',
  'rgb(250, 204, 21)',
  'rgb(239, 68, 68)',
];

const TIPOS_ORDEN: TipoPuntoColeccionEnum[] = [
  TipoPuntoColeccionEnum.DOMICILIARIO,
  TipoPuntoColeccionEnum.CONTENEDOR,
  TipoPuntoColeccionEnum.PUNTO_CRITICO,
];

const TIPO_CHART_COLORS = [
  'rgba(59, 130, 246, 0.75)',
  'rgba(16, 185, 129, 0.75)',
  'rgba(251, 146, 60, 0.75)',
];

@Component({
  selector: 'app-supervisor-estadisticas-puntos-retiro',
  standalone: true,
  imports: [FormsModule, StatCardComponent],
  templateUrl: './estadisticas-puntos-retiro.component.html',
  styleUrl: './estadisticas-puntos-retiro.component.css',
})
export class SupervisorEstadisticasPuntosRetiroComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  private readonly estadisticasService = inject(EstadisticasService);
  private readonly loadingService = inject(LoadingService);

  @ViewChild('estadoChartCanvas') estadoChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('tipoChartCanvas') tipoChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('diariasChartCanvas') diariasChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('zonaChartCanvas') zonaChartCanvas?: ElementRef<HTMLCanvasElement>;

  protected fechaInicio = '';
  protected fechaFin = '';
  protected readonly metricas = signal<MetricasPuntosRetiro | null>(null);
  protected readonly sinDatos = signal(false);

  private chartsReady = false;
  private estadoChart?: Chart;
  private tipoChart?: Chart;
  private diariasChart?: Chart;
  private zonaChart?: Chart;

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
      .obtenerMetricasPuntosRetiro({ desde: this.fechaInicio, hasta: this.fechaFin })
      .pipe(
        catchError(() => {
          toast.error('No se pudieron cargar las estadísticas de puntos de retiro.');
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

  protected statTotalPuntos(): string | number {
    return this.metricas()?.resumen.totalPuntos ?? '—';
  }

  protected statAtendidos(): string {
    const r = this.metricas()?.resumen;
    if (!r) return '—';
    return formatPorcentajeMetrica(r.porcentajeAtendidos);
  }

  protected statPorAtender(): string {
    const r = this.metricas()?.resumen;
    if (!r) return '—';
    const pct = formatPorcentajeMetrica(r.porcentajePorAtender);
    return `${r.porAtender} (${pct})`;
  }

  protected statSaltadosOFallidos(): string {
    const r = this.metricas()?.resumen;
    if (!r) return '—';
    const total = r.saltados + r.fallidos;
    const pct =
      r.totalPuntos > 0
        ? formatPorcentajeMetrica((total / r.totalPuntos) * 100)
        : '—';
    return `${total} (${pct})`;
  }

  protected periodoLabel(): string {
    const p = this.metricas()?.periodo;
    if (!p?.desde && !p?.hasta) return '';
    const desde = p.desde ? formatFechaCorta(p.desde) : '—';
    const hasta = p.hasta ? formatFechaCorta(p.hasta) : '—';
    return `${desde} – ${hasta}`;
  }

  protected puntosProblema(): MetricasPuntosRetiro['puntosConMasProblemas'] {
    return this.metricas()?.puntosConMasProblemas ?? [];
  }

  private renderCharts(): void {
    if (!this.chartsReady) return;

    const data = this.metricas();
    this.destroyCharts();
    if (!data) return;

    this.renderEstadoChart(data);
    this.renderTipoChart(data);
    this.renderDiariasChart(data);
    this.renderZonaChart(data);
  }

  private renderEstadoChart(data: MetricasPuntosRetiro): void {
    const canvas = this.estadoChartCanvas?.nativeElement;
    if (!canvas) return;

    const labels = ESTADOS_ORDEN.map((e) => labelEstadoEjecucionPunto(e));
    const values = ESTADOS_ORDEN.map((e) => data.distribucionPorEstado[e] ?? 0);

    this.estadoChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ESTADO_CHART_COLORS,
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

  private renderTipoChart(data: MetricasPuntosRetiro): void {
    const canvas = this.tipoChartCanvas?.nativeElement;
    if (!canvas) return;

    const dist = data.distribucionPorTipoPunto ?? {};
    const entries = TIPOS_ORDEN.map((tipo) => ({
      label: TIPO_PUNTO_COLECCION_LABELS[tipo],
      value: dist[tipo] ?? 0,
    })).filter((e) => e.value > 0);

    if (entries.length === 0) return;

    this.tipoChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: entries.map((e) => e.label),
        datasets: [
          {
            label: 'Visitas',
            data: entries.map((e) => e.value),
            backgroundColor: entries.map(
              (_, i) => TIPO_CHART_COLORS[i % TIPO_CHART_COLORS.length],
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

  private renderDiariasChart(data: MetricasPuntosRetiro): void {
    const canvas = this.diariasChartCanvas?.nativeElement;
    if (!canvas) return;

    const puntos = data.puntosAtendidosDiarios ?? [];
    if (puntos.length === 0) return;

    const labels = puntos.map((p) => formatFechaCorta(p.fecha));
    const values = puntos.map((p) => p.cantidad);

    this.diariasChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Puntos atendidos',
            data: values,
            backgroundColor: 'rgba(34, 197, 94, 0.75)',
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

  private renderZonaChart(data: MetricasPuntosRetiro): void {
    const canvas = this.zonaChartCanvas?.nativeElement;
    if (!canvas) return;

    const zonas = [...(data.porZona ?? [])]
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    if (zonas.length === 0) return;

    this.zonaChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: zonas.map((z) => z.zonaNombre),
        datasets: [
          {
            label: 'Atendidos',
            data: zonas.map((z) => z.atendidos),
            backgroundColor: 'rgba(34, 197, 94, 0.75)',
            borderRadius: 4,
          },
          {
            label: 'Total visitas',
            data: zonas.map((z) => z.total),
            backgroundColor: 'rgba(148, 163, 184, 0.45)',
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
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  private destroyCharts(): void {
    this.estadoChart?.destroy();
    this.tipoChart?.destroy();
    this.diariasChart?.destroy();
    this.zonaChart?.destroy();
    this.estadoChart = undefined;
    this.tipoChart = undefined;
    this.diariasChart = undefined;
    this.zonaChart = undefined;
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

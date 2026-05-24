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
  type MetricasRutas,
} from '../../../../core/services/estadisticas.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { EstadoEjecucionRutaEnum } from '../../../../shared/enums/EstadoEjecucionRutaEnum';
import {
  formatFechaCorta,
  formatKilometrosPromedio,
  formatPorcentajeMetrica,
  labelEstadoEjecucionRuta,
} from '../../utils/estadisticas-rutas-display.utils';

Chart.register(...registerables);

const ESTADOS_ORDEN: EstadoEjecucionRutaEnum[] = [
  EstadoEjecucionRutaEnum.COMPLETADO,
  EstadoEjecucionRutaEnum.EN_PROCESO,
  EstadoEjecucionRutaEnum.PARCIAL,
  EstadoEjecucionRutaEnum.NO_INICIADO,
  EstadoEjecucionRutaEnum.CANCELADO,
];

const ESTADO_CHART_COLORS = [
  'rgb(34, 197, 94)',
  'rgb(59, 130, 246)',
  'rgb(250, 204, 21)',
  'rgb(148, 163, 184)',
  'rgb(239, 68, 68)',
];

@Component({
  selector: 'app-supervisor-estadisticas-rutas',
  standalone: true,
  imports: [FormsModule, StatCardComponent],
  templateUrl: './estadisticas-rutas.component.html',
  styleUrl: './estadisticas-rutas.component.css',
})
export class SupervisorEstadisticasRutasComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly estadisticasService = inject(EstadisticasService);
  private readonly loadingService = inject(LoadingService);

  @ViewChild('estadoChartCanvas') estadoChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('diariasChartCanvas') diariasChartCanvas?: ElementRef<HTMLCanvasElement>;

  protected fechaInicio = '';
  protected fechaFin = '';
  protected readonly metricas = signal<MetricasRutas | null>(null);
  protected readonly sinDatos = signal(false);

  private chartsReady = false;
  private estadoChart?: Chart;
  private diariasChart?: Chart;

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
      .obtenerMetricasRutas({ desde: this.fechaInicio, hasta: this.fechaFin })
      .pipe(
        catchError(() => {
          toast.error('No se pudieron cargar las estadísticas de rutas.');
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

  protected statTotalEjecuciones(): string | number {
    return this.metricas()?.resumen.totalEjecuciones ?? '—';
  }

  protected statCompletadasATiempo(): string {
    const r = this.metricas()?.resumen;
    if (!r) return '—';
    return formatPorcentajeMetrica(r.porcentajeCompletadasATiempo);
  }

  protected statConIncidencias(): string {
    const r = this.metricas()?.resumen;
    if (!r) return '—';
    return formatPorcentajeMetrica(r.porcentajeConIncidencias);
  }

  protected statKmPromedio(): string {
    return formatKilometrosPromedio(this.metricas()?.resumen.promedioKilometrosRecorridos ?? null);
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
    this.renderDiariasChart(data);
  }

  private renderEstadoChart(data: MetricasRutas): void {
    const canvas = this.estadoChartCanvas?.nativeElement;
    if (!canvas) return;

    const labels = ESTADOS_ORDEN.map((e) => labelEstadoEjecucionRuta(e));
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
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });
  }

  private renderDiariasChart(data: MetricasRutas): void {
    const canvas = this.diariasChartCanvas?.nativeElement;
    if (!canvas) return;

    const puntos = data.rutasDiariasEjecutadas ?? [];
    const labels = puntos.map((p) => formatFechaCorta(p.fecha));
    const values = puntos.map((p) => p.cantidad);

    this.diariasChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Rutas ejecutadas',
            data: values,
            backgroundColor: 'rgba(59, 130, 246, 0.75)',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  private destroyCharts(): void {
    this.estadoChart?.destroy();
    this.diariasChart?.destroy();
    this.estadoChart = undefined;
    this.diariasChart = undefined;
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

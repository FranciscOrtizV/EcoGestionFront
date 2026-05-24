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
  type MetricasCamioneros,
  type MetricasCamionerosConductor,
} from '../../../../core/services/estadisticas.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import {
  formatFechaCorta,
  formatKilometrosEntero,
  formatMinutosPromedio,
  formatPorcentajeMetrica,
} from '../../utils/estadisticas-rutas-display.utils';

Chart.register(...registerables);

@Component({
  selector: 'app-supervisor-estadisticas-camioneros',
  standalone: true,
  imports: [FormsModule, StatCardComponent],
  templateUrl: './estadisticas-camioneros.component.html',
  styleUrl: './estadisticas-camioneros.component.css',
})
export class SupervisorEstadisticasCamionerosComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  private readonly estadisticasService = inject(EstadisticasService);
  private readonly loadingService = inject(LoadingService);

  @ViewChild('resumenChartCanvas') resumenChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('rankingChartCanvas') rankingChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('tiempoChartCanvas') tiempoChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('puntosChartCanvas') puntosChartCanvas?: ElementRef<HTMLCanvasElement>;

  protected fechaInicio = '';
  protected fechaFin = '';
  protected readonly metricas = signal<MetricasCamioneros | null>(null);
  protected readonly sinDatos = signal(false);

  private chartsReady = false;
  private resumenChart?: Chart;
  private rankingChart?: Chart;
  private tiempoChart?: Chart;
  private puntosChart?: Chart;

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
      .obtenerMetricasCamioneros({ desde: this.fechaInicio, hasta: this.fechaFin })
      .pipe(
        catchError(() => {
          toast.error('No se pudieron cargar las estadísticas de camioneros.');
          return of(null);
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe((data) => {
        this.metricas.set(data);
        this.sinDatos.set(
          data == null || data.resumen.totalCamionerosConActividad === 0,
        );
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

  protected statCamioneros(): string | number {
    return this.metricas()?.resumen.totalCamionerosConActividad ?? '—';
  }

  protected statRutasAsignadas(): string | number {
    return this.metricas()?.resumen.totalRutasAsignadas ?? '—';
  }

  protected statRutasEjecutadas(): string | number {
    return this.metricas()?.resumen.totalRutasEjecutadas ?? '—';
  }

  protected statRutasCompletadas(): string | number {
    return this.metricas()?.resumen.totalRutasCompletadas ?? '—';
  }

  protected periodoLabel(): string {
    const p = this.metricas()?.periodo;
    if (!p?.desde && !p?.hasta) return '';
    const desde = p.desde ? formatFechaCorta(p.desde) : '—';
    const hasta = p.hasta ? formatFechaCorta(p.hasta) : '—';
    return `${desde} – ${hasta}`;
  }

  protected margenLabel(): string {
    const m = this.metricas()?.margenMinutosATiempo;
    return m != null ? `${m} min de margen` : '';
  }

  protected tablaConductores(): MetricasCamionerosConductor[] {
    return this.metricas()?.porConductor ?? [];
  }

  protected formatPct(valor: number | null): string {
    return formatPorcentajeMetrica(valor);
  }

  protected formatMin(valor: number | null): string {
    return formatMinutosPromedio(valor);
  }

  protected formatKm(valor: number | null): string {
    return formatKilometrosEntero(valor);
  }

  private renderCharts(): void {
    if (!this.chartsReady) return;

    const data = this.metricas();
    this.destroyCharts();
    if (!data || data.resumen.totalCamionerosConActividad === 0) return;

    this.renderResumenChart(data);
    this.renderRankingChart(data);
    this.renderTiempoChart(data);
    this.renderPuntosChart(data);
  }

  private renderResumenChart(data: MetricasCamioneros): void {
    const canvas = this.resumenChartCanvas?.nativeElement;
    if (!canvas) return;

    const r = data.resumen;

    this.resumenChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Asignadas', 'Ejecutadas', 'Completadas'],
        datasets: [
          {
            label: 'Rutas',
            data: [r.totalRutasAsignadas, r.totalRutasEjecutadas, r.totalRutasCompletadas],
            backgroundColor: [
              'rgba(148, 163, 184, 0.75)',
              'rgba(59, 130, 246, 0.75)',
              'rgba(34, 197, 94, 0.75)',
            ],
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

  private renderRankingChart(data: MetricasCamioneros): void {
    const canvas = this.rankingChartCanvas?.nativeElement;
    if (!canvas) return;

    const conductores = [...(data.rankingMasRutas ?? [])].slice(0, 8);
    if (conductores.length === 0) return;

    this.rankingChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: conductores.map((c) => this.acortarNombre(c.nombreCompleto)),
        datasets: [
          {
            label: 'Asignadas',
            data: conductores.map((c) => c.rutasAsignadas),
            backgroundColor: 'rgba(148, 163, 184, 0.65)',
            borderRadius: 4,
          },
          {
            label: 'Ejecutadas',
            data: conductores.map((c) => c.rutasEjecutadas),
            backgroundColor: 'rgba(59, 130, 246, 0.75)',
            borderRadius: 4,
          },
          {
            label: 'Completadas',
            data: conductores.map((c) => c.rutasCompletadas),
            backgroundColor: 'rgba(34, 197, 94, 0.75)',
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
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  private renderTiempoChart(data: MetricasCamioneros): void {
    const canvas = this.tiempoChartCanvas?.nativeElement;
    if (!canvas) return;

    const conductores = [...(data.porConductor ?? [])]
      .filter((c) => c.rutasEvaluablesTiempo > 0)
      .sort(
        (a, b) =>
          (b.porcentajeCompletadasATiempo ?? 0) -
          (a.porcentajeCompletadasATiempo ?? 0),
      )
      .slice(0, 8);

    if (conductores.length === 0) return;

    this.tiempoChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: conductores.map((c) => this.acortarNombre(c.nombreCompleto)),
        datasets: [
          {
            label: '% a tiempo',
            data: conductores.map((c) => c.porcentajeCompletadasATiempo ?? 0),
            backgroundColor: 'rgba(34, 197, 94, 0.75)',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: (v) => `${v}%` },
          },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  private renderPuntosChart(data: MetricasCamioneros): void {
    const canvas = this.puntosChartCanvas?.nativeElement;
    if (!canvas) return;

    const conductores = [...(data.porConductor ?? [])]
      .filter((c) => c.puntosTotales > 0)
      .sort(
        (a, b) =>
          (b.porcentajePuntosAtendidos ?? 0) - (a.porcentajePuntosAtendidos ?? 0),
      )
      .slice(0, 8);

    if (conductores.length === 0) return;

    this.puntosChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: conductores.map((c) => this.acortarNombre(c.nombreCompleto)),
        datasets: [
          {
            label: '% puntos atendidos',
            data: conductores.map((c) => c.porcentajePuntosAtendidos ?? 0),
            backgroundColor: 'rgba(99, 102, 241, 0.75)',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: (v) => `${v}%` },
          },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  private acortarNombre(nombre: string): string {
    const partes = nombre.trim().split(/\s+/);
    if (partes.length <= 2) return nombre;
    return `${partes[0]} ${partes[1]}`;
  }

  private destroyCharts(): void {
    this.resumenChart?.destroy();
    this.rankingChart?.destroy();
    this.tiempoChart?.destroy();
    this.puntosChart?.destroy();
    this.resumenChart = undefined;
    this.rankingChart = undefined;
    this.tiempoChart = undefined;
    this.puntosChart = undefined;
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

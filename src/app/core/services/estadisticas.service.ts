import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstadoEjecucionRutaEnum } from '../../shared/enums/EstadoEjecucionRutaEnum';
import { ApiResponse, unwrapApiData } from '../models/api-response.model';

export interface FiltroMetricasRutas {
  desde?: string;
  hasta?: string;
  margenMinutosATiempo?: number;
}

export interface MetricasRutasResumen {
  totalEjecuciones: number;
  totalEvaluablesTiempo: number;
  completadasATiempo: number;
  porcentajeCompletadasATiempo: number | null;
  ejecucionesConIncidencias: number;
  porcentajeConIncidencias: number | null;
  promedioKilometrosRecorridos: number | null;
  totalConOdometroRegistrado: number;
}

export interface MetricasRutas {
  periodo: { desde: string | null; hasta: string | null };
  margenMinutosATiempo: number;
  resumen: MetricasRutasResumen;
  distribucionPorEstado: Record<EstadoEjecucionRutaEnum, number>;
  rutasDiariasEjecutadas: Array<{ fecha: string; cantidad: number }>;
}

export interface FiltroMetricasIncidencias {
  desde?: string;
  hasta?: string;
}

export interface MetricasIncidenciasResumen {
  totalIncidencias: number;
  porAtender: number;
  atendidas: number;
  porcentajeAtendidas: number | null;
  porcentajePorAtender: number | null;
  tiempoPromedioResolucionMinutos: number | null;
  totalConResolucionRegistrada: number;
}

export interface MetricasIncidenciasPorTipo {
  tipoId: string;
  tipoNombre: string;
  cantidad: number;
}

export interface MetricasIncidenciasBacklog {
  porAtender: number;
  masDe24Horas: number;
  masDe72Horas: number;
}

export interface MetricasIncidencias {
  periodo: { desde: string | null; hasta: string | null };
  resumen: MetricasIncidenciasResumen;
  backlogActual: MetricasIncidenciasBacklog;
  distribucionPorEstado: Record<string, number>;
  distribucionPorPrioridad: Record<string, number>;
  porTipo: MetricasIncidenciasPorTipo[];
  porZona: Array<{ zonaId: string; zonaNombre: string; cantidad: number }>;
  distribucionPorContexto: {
    vinculadasAEjecucionRuta: number;
    vinculadasAPunto: number;
  };
  incidenciasDiariasReportadas: Array<{ fecha: string; cantidad: number }>;
}

export interface FiltroMetricasPuntosRetiro {
  desde?: string;
  hasta?: string;
}

export interface MetricasPuntosRetiroResumen {
  totalPuntos: number;
  atendidos: number;
  porAtender: number;
  saltados: number;
  fallidos: number;
  porcentajeAtendidos: number | null;
  porcentajePorAtender: number | null;
}

export interface MetricasPuntosRetiroBacklog {
  porAtenderEnEjecucionesActivas: number;
  porAtenderEnEjecucionesParciales: number;
}

export interface MetricasPuntosRetiroPorZona {
  zonaId: string;
  zonaNombre: string;
  total: number;
  atendidos: number;
  porcentajeAtendidos: number | null;
}

export interface MetricasPuntosRetiroPorRuta {
  rutaId: string;
  rutaNombre: string;
  total: number;
  atendidos: number;
  porcentajeAtendidos: number | null;
}

export interface MetricasPuntosRetiroProblema {
  puntoRecoleccionId: string;
  puntoNombre: string;
  totalIncidencias: number;
  vecesFallido: number;
  vecesSaltado: number;
  indiceProblemas: number;
}

export interface MetricasPuntosRetiro {
  periodo: { desde: string | null; hasta: string | null };
  resumen: MetricasPuntosRetiroResumen;
  backlogActual: MetricasPuntosRetiroBacklog;
  distribucionPorEstado: Record<string, number>;
  distribucionPorTipoPunto: Record<string, number>;
  porZona: MetricasPuntosRetiroPorZona[];
  porcentajeAtendidosPorRuta: MetricasPuntosRetiroPorRuta[];
  puntosConMasProblemas: MetricasPuntosRetiroProblema[];
  puntosAtendidosDiarios: Array<{ fecha: string; cantidad: number }>;
}

@Injectable({ providedIn: 'root' })
export class EstadisticasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/estadisticas`;

  obtenerMetricasRutas(filtro: FiltroMetricasRutas = {}): Observable<MetricasRutas> {
    let params = new HttpParams();

    if (filtro.desde) {
      params = params.set('desde', filtro.desde);
    }
    if (filtro.hasta) {
      params = params.set('hasta', filtro.hasta);
    }
    if (filtro.margenMinutosATiempo != null) {
      params = params.set('margenMinutosATiempo', String(filtro.margenMinutosATiempo));
    }

    return this.http
      .get<ApiResponse<MetricasRutas>>(`${this.base}/rutas`, { params })
      .pipe(map((res) => unwrapApiData(res)));
  }

  obtenerMetricasIncidencias(
    filtro: FiltroMetricasIncidencias = {},
  ): Observable<MetricasIncidencias> {
    let params = new HttpParams();

    if (filtro.desde) {
      params = params.set('desde', filtro.desde);
    }
    if (filtro.hasta) {
      params = params.set('hasta', filtro.hasta);
    }

    return this.http
      .get<ApiResponse<MetricasIncidencias>>(`${this.base}/incidencias`, { params })
      .pipe(map((res) => unwrapApiData(res)));
  }

  obtenerMetricasPuntosRetiro(
    filtro: FiltroMetricasPuntosRetiro = {},
  ): Observable<MetricasPuntosRetiro> {
    let params = new HttpParams();

    if (filtro.desde) {
      params = params.set('desde', filtro.desde);
    }
    if (filtro.hasta) {
      params = params.set('hasta', filtro.hasta);
    }

    return this.http
      .get<ApiResponse<MetricasPuntosRetiro>>(`${this.base}/puntos-retiro`, { params })
      .pipe(map((res) => unwrapApiData(res)));
  }
}

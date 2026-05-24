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
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  CreateRutaRequest,
  RutaDetail,
  RutaPuntoLineaDetail,
  RutaRow,
  UpdateRutaRequest,
} from '../../feature/rutas/types';
import { ApiResponse, unwrapApiData } from '../models/api-response.model';

interface PuntoRutaApiDto {
  id: string;
  puntoRecoleccion: {
    id: string;
    nombre: string;
    direccion?: string;
  };
  ordenSecuencia: number;
  estimacionParadaMinutos?: number;
  createdAt: string;
  updatedAt: string;
}

/** Ruta tal como viene en GET /rutas y GET /rutas/:id */
interface RutaApiDto {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  tipoRuta: string;
  estimacionDuracionMinutos: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  puntosRuta: PuntoRutaApiDto[];
  estado?: string | null;
  planificacionTiempoInicio?: string | null;
  planificacionTiempoFin?: string | null;
}

/** Ítem plano devuelto por GET /rutas/asignadas (ejecución de ruta). */
interface RutaAsignadaListaApiDto {
  ejecucionRutaId: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  tipoRuta?: string | null;
  estimacionMinutos: number;
  estado: string;
  planificacionTiempoInicio?: string | null;
  planificacionTiempoFin?: string | null;
  modeloVehiculo?: string | null;
  patente?: string | null;
  capacidadKg?: string | number | null;
}

type RutasAsignadasFilters = {
  conductorId?: string;
  planificadorId?: string;
  supervisorId?: string;
  incluirInactivos?: boolean;
};

function buildParadasResumen(puntos: PuntoRutaApiDto[]): string {
  if (!puntos?.length) {
    return '—';
  }
  const names = [...puntos]
    .sort((a, b) => a.ordenSecuencia - b.ordenSecuencia)
    .map((p) => p.puntoRecoleccion?.nombre?.trim() || 'Sin nombre');
  const full = names.join(' → ');
  return full.length > 120 ? `${full.slice(0, 117)}…` : full;
}

function formatCapacidadKgLabel(raw?: string | number | null): string | null {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
  if (Number.isNaN(n)) {
    return `${raw} kg`;
  }
  const formatted = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(n);
  return `${formatted} kg`;
}

@Injectable({ providedIn: 'root' })
export class RutasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/rutas`;

  private mapDto(dto: RutaApiDto): RutaRow {
    const puntos = dto.puntosRuta ?? [];
    return {
      id: dto.id,
      nombre: dto.nombre,
      codigo: dto.codigo,
      descripcion: dto.descripcion,
      tipoRuta: dto.tipoRuta,
      estimacionDuracionMinutos: dto.estimacionDuracionMinutos,
      estado: dto.estado ?? null,
      planificacionTiempoInicio: dto.planificacionTiempoInicio ?? null,
      planificacionTiempoFin: dto.planificacionTiempoFin ?? null,
      isActive: dto.isActive,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      paradasCount: puntos.length,
      paradasResumen: buildParadasResumen(puntos),
    };
  }

  /** Una fila por ejecución; `id` es `ejecucionRutaId` (único en listados del conductor). */
  private mapAsignadaListaToRutaRow(dto: RutaAsignadaListaApiDto): RutaRow {
    const ts = dto.planificacionTiempoInicio ?? dto.planificacionTiempoFin ?? '';
    return {
      id: dto.ejecucionRutaId,
      nombre: dto.nombre,
      codigo: dto.codigo,
      descripcion: dto.descripcion,
      tipoRuta: (dto.tipoRuta ?? '').trim() || '—',
      estimacionDuracionMinutos: dto.estimacionMinutos,
      estado: dto.estado,
      planificacionTiempoInicio: dto.planificacionTiempoInicio ?? null,
      planificacionTiempoFin: dto.planificacionTiempoFin ?? null,
      vehiculoModelo: dto.modeloVehiculo?.trim() || null,
      vehiculoPatente: dto.patente?.trim() || null,
      vehiculoCapacidadKg: formatCapacidadKgLabel(dto.capacidadKg ?? null),
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
      paradasCount: 0,
      paradasResumen: '—',
    };
  }

  private mapPuntosLinea(puntos: PuntoRutaApiDto[]): RutaPuntoLineaDetail[] {
    return [...puntos]
      .sort((a, b) => a.ordenSecuencia - b.ordenSecuencia)
      .map((p) => ({
        id: p.id,
        puntoRecoleccionId: p.puntoRecoleccion.id,
        ordenSecuencia: p.ordenSecuencia,
        estimacionParadaMinutos: p.estimacionParadaMinutos,
      }));
  }

  private mapDetail(dto: RutaApiDto): RutaDetail {
    const puntos = dto.puntosRuta ?? [];
    return {
      id: dto.id,
      nombre: dto.nombre,
      codigo: dto.codigo,
      descripcion: dto.descripcion,
      tipoRuta: dto.tipoRuta,
      estimacionDuracionMinutos: dto.estimacionDuracionMinutos,
      isActive: dto.isActive,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      puntosLinea: this.mapPuntosLinea(puntos),
    };
  }

  findAll(incluirInactivos = true): Observable<RutaRow[]> {
    const q = incluirInactivos ? '?incluirInactivos=true' : '';
    return this.http.get<ApiResponse<RutaApiDto[]>>(`${this.base}${q}`).pipe(
      map((res) => unwrapApiData(res).map((dto) => this.mapDto(dto))),
    );
  }

  findRutasAsignadas(filters: RutasAsignadasFilters): Observable<RutaRow[]> {
    let params = new HttpParams();
    if (filters.conductorId) {
      params = params.set('conductorId', filters.conductorId);
    }
    if (filters.planificadorId) {
      params = params.set('planificadorId', filters.planificadorId);
    }
    if (filters.supervisorId) {
      params = params.set('supervisorId', filters.supervisorId);
    }
    if (filters.incluirInactivos !== undefined) {
      params = params.set('incluirInactivos', String(filters.incluirInactivos));
    }

    return this.http
      .get<ApiResponse<RutaAsignadaListaApiDto[]>>(`${this.base}/asignadas`, { params })
      .pipe(map((res) => unwrapApiData(res).map((dto) => this.mapAsignadaListaToRutaRow(dto))));
  }

  getById(id: string): Observable<RutaDetail> {
    return this.http
      .get<ApiResponse<RutaApiDto>>(`${this.base}/${id}`)
      .pipe(map((res) => this.mapDetail(unwrapApiData(res))));
  }

  create(body: CreateRutaRequest): Observable<void> {
    return this.http.post<ApiResponse<unknown>>(this.base, body).pipe(map(() => undefined));
  }

  update(id: string, body: UpdateRutaRequest): Observable<void> {
    return this.http
      .patch<ApiResponse<unknown>>(`${this.base}/${id}`, body)
      .pipe(map(() => undefined));
  }

  deshabilitar(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }

  rehabilitar(id: string): Observable<void> {
    return this.http
      .patch<ApiResponse<unknown>>(`${this.base}/rehabilitar/${id}`, {})
      .pipe(map(() => undefined));
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  AsignacionRutaEditData,
  AsignacionRutaDetalle,
  AsignacionRutaRow,
  CreateAsignacionRutaRequest,
  TurnoEnum,
  UpdateAsignacionRutaRequest,
} from '../../feature/asignacionRutas/types';
import { ApiResponse, unwrapApiData } from '../models/api-response.model';

interface RutaApiDto {
  id: string;
  nombre: string;
  codigo: string;
  estimacionDuracionMinutos?: number;
}

interface VehiculoApiDto {
  id: string;
  patente: string;
  marca: string | null;
  modelo: string | null;
}

interface PersonaApiDto {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

interface AsignacionRutaApiDto {
  id: string;
  ruta: RutaApiDto;
  vehiculo: VehiculoApiDto;
  conductor: PersonaApiDto;
  planificador: PersonaApiDto;
  supervisor?: PersonaApiDto | null;
  fechaAsignacion: string;
  turno: string;
  planificacionTiempoInicio?: string | null;
  planificacionTiempoFin?: string | null;
  estado: string;
  notas?: string | null;
}

function nombreCompleto(p?: PersonaApiDto | null): string {
  if (!p) {
    return '—';
  }
  const full = `${p.nombre} ${p.apellidoPaterno} ${p.apellidoMaterno}`.trim().replace(/\s+/g, ' ');
  return full || '—';
}

function vehiculoNombre(v: VehiculoApiDto): string {
  const extra = `${v.marca ?? ''} ${v.modelo ?? ''}`.trim();
  return extra ? `${v.patente} (${extra})` : v.patente;
}

function formatFechaHora(iso?: string | null): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

@Injectable({ providedIn: 'root' })
export class AsignacionRutasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/asignacion-rutas`;

  private mapDetalle(dto: AsignacionRutaApiDto): AsignacionRutaDetalle {
    const min = dto.ruta?.estimacionDuracionMinutos;
    return {
      rutaNombre: dto.ruta?.nombre ?? '—',
      rutaCodigo: dto.ruta?.codigo ?? '—',
      planificadorNombre: nombreCompleto(dto.planificador),
      conductorNombre: nombreCompleto(dto.conductor),
      supervisorNombre: nombreCompleto(dto.supervisor),
      estimacionDuracionMinutos:
        min !== undefined && min !== null && Number.isFinite(min) ? min : null,
      planificacionTiempoInicio: formatFechaHora(dto.planificacionTiempoInicio),
      planificacionTiempoFin: formatFechaHora(dto.planificacionTiempoFin),
      estado: dto.estado ?? '—',
      notas: (dto.notas ?? '').trim() || '—',
    };
  }

  private mapDto(dto: AsignacionRutaApiDto): AsignacionRutaRow {
    return {
      id: dto.id,
      rutaNombre: dto.ruta?.nombre ?? '—',
      vehiculoNombre: dto.vehiculo ? vehiculoNombre(dto.vehiculo) : '—',
      conductorNombre: nombreCompleto(dto.conductor),
      planificacionInicio: formatFechaHora(dto.planificacionTiempoInicio),
      planificacionFin: formatFechaHora(dto.planificacionTiempoFin),
      turno: dto.turno ?? '—',
      estado: dto.estado ?? '—',
    };
  }

  private mapEditData(dto: AsignacionRutaApiDto): AsignacionRutaEditData {
    return {
      id: dto.id,
      rutaId: dto.ruta?.id ?? '',
      vehiculoId: dto.vehiculo?.id ?? '',
      conductorId: dto.conductor?.id ?? '',
      supervisorId: dto.supervisor?.id ?? null,
      turno: (dto.turno ?? 'MANANA') as TurnoEnum,
      planificacionTiempoInicio: toDatetimeLocal(dto.planificacionTiempoInicio),
      planificacionTiempoFin: toDatetimeLocal(dto.planificacionTiempoFin),
      notas: dto.notas ?? '',
    };
  }

  getById(id: string): Observable<AsignacionRutaDetalle> {
    return this.http
      .get<ApiResponse<AsignacionRutaApiDto>>(`${this.base}/${id}`)
      .pipe(map((res) => this.mapDetalle(unwrapApiData(res))));
  }

  getByIdForEdit(id: string): Observable<AsignacionRutaEditData> {
    return this.http
      .get<ApiResponse<AsignacionRutaApiDto>>(`${this.base}/${id}`)
      .pipe(map((res) => this.mapEditData(unwrapApiData(res))));
  }

  findByRangoFechas(fechaInicio: string, fechaFin: string): Observable<AsignacionRutaRow[]> {
    const qs = `?fechaInicio=${encodeURIComponent(fechaInicio)}&fechaFin=${encodeURIComponent(fechaFin)}`;
    return this.http
      .get<ApiResponse<AsignacionRutaApiDto[]>>(`${this.base}/rango-fechas${qs}`)
      .pipe(map((res) => unwrapApiData(res).map((dto) => this.mapDto(dto))));
  }

  create(body: CreateAsignacionRutaRequest): Observable<void> {
    return this.http.post<ApiResponse<unknown>>(this.base, body).pipe(map(() => undefined));
  }

  update(id: string, body: UpdateAsignacionRutaRequest): Observable<void> {
    return this.http
      .patch<ApiResponse<unknown>>(`${this.base}/${id}`, body)
      .pipe(map(() => undefined));
  }

  publicar(id: string): Observable<void> {
    return this.http
      .patch<ApiResponse<unknown>>(`${this.base}/${id}/publicar`, {})
      .pipe(map(() => undefined));
  }
}

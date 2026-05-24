import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  IncidenciaDetalleApiDto,
  IncidenciaEvidenciaApiDto,
  IncidenciaListItemApiDto,
} from '../interfaces/response';
import { ApiResponse, unwrapApiData } from '../models/api-response.model';
import type { IncidenciaDetalle } from '../../feature/incidencias/types/incidenciaDetalle.type';
import type { IncidenciaEvidencia } from '../../feature/incidencias/types/incidenciaEvidencia.type';
import type { IncidenciaListItem } from '../../feature/incidencias/types/incidenciaListItem.type';
import type { ReportarIncidenciaPuntoRequest } from '../../feature/incidencias/types/reportarIncidenciaPuntoRequest.type';
import type { ResolverIncidenciaRequest } from '../../feature/incidencias/types/resolverIncidenciaRequest.type';

@Injectable({ providedIn: 'root' })
export class IncidenciasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ejecucion-rutas/incidencias`;
  private readonly listBase = `${environment.apiUrl}/incidencias`;

  getAllIncidencias(): Observable<IncidenciaListItem[]> {
    return this.http
      .get<ApiResponse<IncidenciaListItemApiDto[]>>(`${this.listBase}/getAll`)
      .pipe(map((res) => unwrapApiData(res).map(mapIncidenciaListItem)));
  }

  getIncidenciaById(id: string): Observable<IncidenciaDetalle> {
    return this.http
      .get<ApiResponse<IncidenciaDetalleApiDto>>(`${this.listBase}/${id}`)
      .pipe(map((res) => mapIncidenciaDetalle(unwrapApiData(res))));
  }

  resolverIncidencia(id: string, body: ResolverIncidenciaRequest): Observable<void> {
    return this.http
      .patch<ApiResponse<unknown>>(`${this.listBase}/${id}/resolucion`, body)
      .pipe(map(() => undefined));
  }

  reportarPunto(body: ReportarIncidenciaPuntoRequest): Observable<void> {
    const formData = new FormData();
    formData.append('puntoRutaEjecucionId', body.puntoRutaEjecucionId);
    formData.append('tipoIncidenciaId', body.tipoIncidenciaId);
    formData.append('titulo', body.titulo.trim());
    formData.append('descripcion', body.descripcion.trim());
    formData.append('prioridad', body.prioridad);
    formData.append('latitud', String(body.latitud));
    formData.append('longitud', String(body.longitud));

    if (body.evidenciaFoto) {
      formData.append('fotografia', base64ToJpegFile(body.evidenciaFoto));
    }

    return this.http.post<unknown>(this.base, formData).pipe(map(() => undefined));
  }
}

function apiOrigin(): string {
  return environment.apiUrl.replace(/\/api\/?$/i, '');
}

function resolverUrlMedia(url: string | null | undefined): string {
  const trimmed = String(url ?? '').trim();
  if (trimmed === '') return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? `${apiOrigin()}${trimmed}` : `${apiOrigin()}/${trimmed}`;
}

function mapIncidenciaEvidencia(dto: IncidenciaEvidenciaApiDto): IncidenciaEvidencia {
  const fileUrl = resolverUrlMedia(dto.fileUrl);
  const urlFotoRaw = dto.urlFoto?.trim() || dto.fileUrl?.trim() || '';

  return {
    id: dto.id,
    fileUrl,
    urlFoto: resolverUrlMedia(urlFotoRaw) || fileUrl,
    fileName: dto.fileName?.trim() || 'evidencia',
    mimeType: dto.mimeType?.trim() || '',
    fileSizeBytes: dto.fileSizeBytes ?? null,
    latitud: Number.isFinite(dto.latitud) ? dto.latitud : null,
    longitud: Number.isFinite(dto.longitud) ? dto.longitud : null,
    takenAt: dto.takenAt?.trim() || null,
    createdAt: dto.createdAt,
  };
}

function coerceFechaReporte(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

function mapIncidenciaDetalle(dto: IncidenciaDetalleApiDto): IncidenciaDetalle {
  return {
    id: dto.id,
    titulo: dto.titulo,
    tipoIncidencia: dto.tipoIncidencia,
    ruta: dto.ruta,
    puntoRecoleccion: dto.puntoRecoleccion,
    reportadoPor: dto.reportadoPor,
    resueltoPor: dto.resueltoPor,
    descripcion: dto.descripcion,
    estado: dto.estado,
    prioridad: dto.prioridad,
    latitud: Number.isFinite(dto.latitud) ? dto.latitud : null,
    longitud: Number.isFinite(dto.longitud) ? dto.longitud : null,
    fechaReporte: dto.fechaReporte ? coerceFechaReporte(dto.fechaReporte) : null,
    evidencias: (dto.evidencias ?? []).map(mapIncidenciaEvidencia),
    comentarioResolucion: dto.comentarioResolucion?.trim() || null,
    fechaResolucion: dto.fechaResolucion ? coerceFechaReporte(dto.fechaResolucion) : null,
  };
}

function mapIncidenciaListItem(dto: IncidenciaListItemApiDto): IncidenciaListItem {
  return {
    id: dto.id,
    tipoIncidencia: dto.tipoIncidencia,
    ruta: dto.ruta,
    puntoRecoleccion: dto.puntoRecoleccion,
    reportadoPor: dto.reportadoPor,
    titulo: dto.titulo,
    descripcion: dto.descripcion,
    estado: dto.estado,
    prioridad: dto.prioridad,
    fechaReporte:
      typeof dto.fechaReporte === 'string'
        ? dto.fechaReporte
        : new Date(dto.fechaReporte as unknown as string).toISOString(),
  };
}

function base64ToJpegFile(base64: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], 'incidencia.jpg', { type: 'image/jpeg' });
}

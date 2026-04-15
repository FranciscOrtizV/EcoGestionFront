import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, unwrapApiData } from '../models/api-response.model';
import type { CreateZonaRequest, UpdateZonaRequest, ZonaRow } from '../../feature/zonas/types';

/** DTO tal como lo devuelve el backend en listados. */
interface ZonaApiDto {
  id: string;
  nombre: string;
  codigo: string | null;
  descripcion: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ZonasService {
  private readonly http = inject(HttpClient);

  private mapZonaDto(dto: ZonaApiDto): ZonaRow {
    return {
      id: dto.id,
      nombre: dto.nombre,
      codigo: dto.codigo,
      descripcion: dto.descripcion,
      isActive: dto.isActive,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  }

  getZonaById(id: string): Observable<ZonaRow> {
    return this.http
      .get<ApiResponse<ZonaApiDto>>(`${environment.apiUrl}/zonas/${id}`)
      .pipe(map((res) => this.mapZonaDto(unwrapApiData(res))));
  }

  findAll(): Observable<ZonaRow[]> {
    return this.http.get<ApiResponse<ZonaApiDto[]>>(`${environment.apiUrl}/zonas`).pipe(
      map((res) => unwrapApiData(res).map((dto) => this.mapZonaDto(dto))),
    );
  }

  createZona(body: CreateZonaRequest): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${environment.apiUrl}/zonas`, body)
      .pipe(map(() => undefined));
  }

  updateZona(id: string, body: UpdateZonaRequest): Observable<void> {
    return this.http
      .patch<ApiResponse<unknown>>(`${environment.apiUrl}/zonas/${id}`, body)
      .pipe(map(() => undefined));
  }

  /** Deshabilita la zona (soft delete / baja lógica). */
  deshabilitarZona(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`${environment.apiUrl}/zonas/${id}`)
      .pipe(map(() => undefined));
  }

  rehabilitarZona(id: string): Observable<void> {
    return this.http
      .patch<ApiResponse<unknown>>(`${environment.apiUrl}/zonas/rehabilitar/${id}`, {})
      .pipe(map(() => undefined));
  }
}

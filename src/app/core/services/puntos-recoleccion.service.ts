import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, unwrapApiData } from '../models/api-response.model';
import type {
  CreatePuntoRecoleccionRequest,
  PuntoRecoleccionRow,
  UpdatePuntoRecoleccionRequest,
} from '../../feature/puntosRecoleccion/types';

interface ZonaNestedDto {
  id: string;
  nombre: string;
}

interface PuntoRecoleccionApiDto {
  id: string;
  zona: ZonaNestedDto;
  nombre: string;
  direccion: string;
  referencia: string | null;
  latitud: string | number;
  longitud: string | number;
  tipoPunto: string;
  prioridad: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function num(v: string | number): number {
  return typeof v === 'number' ? v : Number(v);
}

@Injectable({ providedIn: 'root' })
export class PuntosRecoleccionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/puntos-recoleccion`;

  private mapDto(dto: PuntoRecoleccionApiDto): PuntoRecoleccionRow {
    return {
      id: dto.id,
      zonaId: dto.zona.id,
      zonaNombre: dto.zona.nombre,
      nombre: dto.nombre,
      direccion: dto.direccion,
      referencia: dto.referencia,
      latitud: num(dto.latitud),
      longitud: num(dto.longitud),
      tipoPunto: dto.tipoPunto,
      prioridad: dto.prioridad,
      isActive: dto.isActive,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  }

  getById(id: string): Observable<PuntoRecoleccionRow> {
    return this.http
      .get<ApiResponse<PuntoRecoleccionApiDto>>(`${this.base}/${id}`)
      .pipe(map((res) => this.mapDto(unwrapApiData(res))));
  }

  findAll(): Observable<PuntoRecoleccionRow[]> {
    return this.http.get<ApiResponse<PuntoRecoleccionApiDto[]>>(`${this.base}?incluirInactivos=true`).pipe(
      map((res) => unwrapApiData(res).map((dto) => this.mapDto(dto))),
    );
  }

  create(body: CreatePuntoRecoleccionRequest): Observable<void> {

    return this.http
      .post<ApiResponse<unknown>>(`${this.base}`, body)
      .pipe(map(() => undefined));
  }

  update(id: string, body: UpdatePuntoRecoleccionRequest): Observable<void> {
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

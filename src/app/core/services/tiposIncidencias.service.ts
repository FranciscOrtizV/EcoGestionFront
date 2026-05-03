import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, unwrapApiData } from '../models/api-response.model';
import { TiposIncidenciasListApiDto } from '../interfaces/response';
import type {
  CreateTipoIncidenciaRequest,
  TipoIncidenciaRow,
  UpdateTipoIncidenciaRequest,
} from '../../feature/tiposIncidencias/types';

@Injectable({ providedIn: 'root' })
export class TiposIncidenciasService {

  private readonly http = inject(HttpClient);

  getTipoIncidenciaById(id: string): Observable<TiposIncidenciasListApiDto> {
    return this.http
      .get<ApiResponse<TiposIncidenciasListApiDto>>(`${environment.apiUrl}/tipos-incidencias/${id}`)
      .pipe(map((res) => unwrapApiData(res)));
  }

  getTiposIncidencias(): Observable<TipoIncidenciaRow[]> {
    return this.http.get<ApiResponse<TiposIncidenciasListApiDto[]>>(`${environment.apiUrl}/tipos-incidencias`).pipe(
      map((res) => unwrapApiData(res).map((dto) => {
        return {
          id: dto.id,
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          isActive: dto.isActive,
        }
      })),
    );
  }

  createTipoIncidencia(body: CreateTipoIncidenciaRequest): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${environment.apiUrl}/tipos-incidencias`, body)
      .pipe(map(() => undefined));
  }

  updateTipoIncidencia(id: string, body: UpdateTipoIncidenciaRequest): Observable<void> {
    return this.http
      .patch<ApiResponse<unknown>>(`${environment.apiUrl}/tipos-incidencias/${id}`, body)
      .pipe(map(() => undefined));
  }

  rehabilitarTipoIncidencia(id: string): Observable<void> {
    return this.http
      .patch<ApiResponse<unknown>>(`${environment.apiUrl}/tipos-incidencias/rehabilitar/${id}`, {})
      .pipe(map(() => undefined));
  }

  removeTipoIncidencia(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`${environment.apiUrl}/tipos-incidencias/${id}`)
      .pipe(map(() => undefined));
  }

}

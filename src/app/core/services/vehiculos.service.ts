import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, unwrapApiData } from '../models/api-response.model';
import type { CreateVehiculoRequest, UpdateVehiculoRequest, VehiculoRow } from '../../feature/vehiculos/types';
import { VehiculoListApiDto } from '../interfaces/response/VehiculoListApiDto';

@Injectable({ providedIn: 'root' })
export class VehiculosService {

  private readonly http = inject(HttpClient);

  getVehiculoById(id: string): Observable<VehiculoListApiDto> {
    return this.http.get<ApiResponse<VehiculoListApiDto>>(`${environment.apiUrl}/vehiculos/${id}`).pipe(
      map((res) => unwrapApiData(res)),
    );
  }

  // Obtiene el listado de vehículos
  getVehiculos(): Observable<VehiculoRow[]> {
    return this.http.get<ApiResponse<VehiculoListApiDto[]>>(`${environment.apiUrl}/vehiculos`).pipe(
      map((res) => unwrapApiData(res).map((dto) => {
        return {
          id: dto.id,
          patente: dto.patente,
          codigoInterno: dto.codigoInterno,
          marca: dto.marca,
          modelo: dto.modelo,
          estado: dto.estado,
          isActive: dto.isActive,
        }
      })),
    );
  }

  createVehiculo(body: CreateVehiculoRequest): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${environment.apiUrl}/vehiculos`, body)
      .pipe(map(() => undefined));
  }

  updateVehiculo(id: string, body: UpdateVehiculoRequest): Observable<void> {
    return this.http
      .patch<ApiResponse<unknown>>(`${environment.apiUrl}/vehiculos/${id}`, body)
      .pipe(map(() => undefined));
  }
}

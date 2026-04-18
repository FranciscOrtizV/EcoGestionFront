import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { RutaRow } from '../../feature/rutas/types';
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
}

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
      isActive: dto.isActive,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      paradasCount: puntos.length,
      paradasResumen: buildParadasResumen(puntos),
    };
  }

  findAll(incluirInactivos = true): Observable<RutaRow[]> {
    const q = incluirInactivos ? '?incluirInactivos=true' : '';
    return this.http.get<ApiResponse<RutaApiDto[]>>(`${this.base}${q}`).pipe(
      map((res) => unwrapApiData(res).map((dto) => this.mapDto(dto))),
    );
  }
}

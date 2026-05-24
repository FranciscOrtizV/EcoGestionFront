import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ReportarIncidenciaPuntoRequest } from '../../feature/incidencias/types/reportarIncidenciaPuntoRequest.type';

@Injectable({ providedIn: 'root' })
export class IncidenciasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ejecucion-rutas/incidencias`;

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

function base64ToJpegFile(base64: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], 'incidencia.jpg', { type: 'image/jpeg' });
}

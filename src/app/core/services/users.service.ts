import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, unwrapApiData } from '../models/api-response.model';
import type { UserRow } from '../../feature/users/types';
import { UserListApiDto } from '../interfaces/response';

@Injectable({ providedIn: 'root' })
export class UsersService {

  private readonly http = inject(HttpClient);

  // Obtiene el listado de usuarios
  getUsers(): Observable<UserRow[]> {
    return this.http.get<ApiResponse<UserListApiDto[]>>(`${environment.apiUrl}/usuarios`).pipe(
      map((res) => unwrapApiData(res).map((dto) => {
        return {
          id: dto.id,
          name: ( dto.nombre + ' ' + dto.apellidoPaterno ) || dto.email,
          email: dto.email,
          role: dto.roles?.map(rol => rol.nombre).join(", ")!,
          active: dto.isActive,
        }
      })),
    );
  }

  desactivarUser(id: string): Observable<void> {
    return this.http
      .delete(`${environment.apiUrl}/usuarios/${id}`, { observe: 'response' })
      .pipe(map(() => undefined));
  }

  /** Ajusta la URL si tu API usa otra ruta o método. */
  activarUser(id: string): Observable<void> {
    return this.http
      .patch(`${environment.apiUrl}/usuarios/habilitar/${id}`, {}, { observe: 'response' })
      .pipe(map(() => undefined));
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, unwrapApiData } from '../models/api-response.model';
import type { CreateUserRequest, UpdateUserRequest, UserRow } from '../../feature/users/types';
import { RoleDto, UserListApiDto } from '../interfaces/response';

@Injectable({ providedIn: 'root' })
export class UsersService {

  private readonly http = inject(HttpClient);

  /** Catálogo de roles (UUID + nombre). Ajusta la ruta si tu Nest usa otro path. */
  getRoles(): Observable<RoleDto[]> {
    return this.http.get<ApiResponse<RoleDto[]>>(`${environment.apiUrl}/usuarios/roles`).pipe(
      map((res) => unwrapApiData(res)),
    );
  }

  /** Detalle de un usuario (misma forma que en listado). Ajusta la ruta si tu Nest usa otro path. */
  getUserById(id: string): Observable<UserListApiDto> {
    return this.http.get<ApiResponse<UserListApiDto>>(`${environment.apiUrl}/usuarios/${id}`).pipe(
      map((res) => unwrapApiData(res)),
    );
  }

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

  /** Crea un usuario. Si tu API usa otra ruta o forma del body, ajusta aquí. */
  createUser(body: CreateUserRequest): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${environment.apiUrl}/usuarios`, body)
      .pipe(map(() => undefined));
  }

  /** Actualiza un usuario. Ajusta método o ruta si tu Nest usa PUT u otro path. */
  updateUser(id: string, body: UpdateUserRequest): Observable<void> {
    return this.http
      .patch<ApiResponse<unknown>>(`${environment.apiUrl}/usuarios/${id}`, body)
      .pipe(map(() => undefined));
  }
}

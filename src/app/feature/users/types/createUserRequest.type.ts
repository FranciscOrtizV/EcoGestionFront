/** Cuerpo alineado con `CreateUsuarioDto` de Nest. */
export interface CreateUserRequest {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  password: string;
  phone?: string;
  rolesIds: string[];
}

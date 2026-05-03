/**
 * Alineado con `UpdateUsuarioDto` de Nest: todas opcionales.
 * Solo deben enviarse las propiedades que quieres actualizar.
 * `phone: null` indica limpiar teléfono en BD (si tu servicio Nest lo interpreta así).
 */
export interface UpdateUserRequest {
  nombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  email?: string;
  password?: string;
  phone?: string | null;
  rolesIds?: string[];
}

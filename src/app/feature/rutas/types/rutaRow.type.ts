/** Fila derivada del listado de rutas para la tabla de administración. */
export type RutaRow = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  tipoRuta: string;
  estimacionDuracionMinutos: number;
  estado?: string | null;
  planificacionTiempoInicio?: string | null;
  planificacionTiempoFin?: string | null;
  /** Solo en filas provenientes de asignaciones (p. ej. conductor). */
  vehiculoModelo?: string | null;
  vehiculoPatente?: string | null;
  /** Texto ya formateado, p. ej. "1.400 kg". */
  vehiculoCapacidadKg?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  paradasCount: number;
  /** Nombres de puntos ordenados por `ordenSecuencia` (texto compacto). */
  paradasResumen: string;
};

/** Vista de solo lectura del detalle de una asignación de ruta. */
export type AsignacionRutaDetalle = {
  rutaNombre: string;
  rutaCodigo: string;
  planificadorNombre: string;
  conductorNombre: string;
  supervisorNombre: string;
  estimacionDuracionMinutos: number | null;
  planificacionTiempoInicio: string;
  planificacionTiempoFin: string;
  estado: string;
  notas: string;
};

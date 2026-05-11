/** Detalle de una ejecución de ruta asignada. */
export type EjecucionRutaDetalle = {
  ejecucionRutaId: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  tipoRuta: string | null;
  estimacionMinutos: number;
  estado: string;
  planificacionTiempoInicio: string | null;
  planificacionTiempoFin: string | null;
  modeloVehiculo: string | null;
  patente: string | null;
  capacidadKg: string | number | null;
};

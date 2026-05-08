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
  puntosRuta: PuntoRuta[];
};

type PuntoRuta = {
  orden_secuencia: number;
  nombre_punto_recoleccion: string;
  direccion: string;
  referencia?: string;
  latitud: number;
  longitud: number;
  tipo_punto: string;
  prioridad?: number;
};

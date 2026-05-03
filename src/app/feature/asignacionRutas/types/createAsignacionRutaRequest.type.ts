export type TurnoEnum = 'MANANA' | 'TARDE' | 'NOCHE';

export type EstadoAsignacionRutaEnum =
  | 'BORRADOR'
  | 'PUBLICADO'
  | 'EN_PROCESO'
  | 'COMPLETADO'
  | 'CANCELADO';

export type CreateAsignacionRutaRequest = {
  rutaId: string;
  vehiculoId: string;
  conductorId: string;
  planificadorId: string;
  supervisorId?: string;
  fechaAsignacion: string;
  turno: TurnoEnum;
  planificacionTiempoInicio?: Date;
  planificacionTiempoFin?: Date;
  notas?: string;
};

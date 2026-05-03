import type { TurnoEnum } from './createAsignacionRutaRequest.type';

export type UpdateAsignacionRutaRequest = {
  rutaId?: string;
  vehiculoId?: string;
  conductorId?: string;
  planificadorId?: string;
  supervisorId?: string | null;
  fechaAsignacion?: string;
  turno?: TurnoEnum;
  planificacionTiempoInicio?: Date;
  planificacionTiempoFin?: Date;
  notas?: string;
};

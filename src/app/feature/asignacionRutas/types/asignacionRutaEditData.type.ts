import type { TurnoEnum } from './createAsignacionRutaRequest.type';

export type AsignacionRutaEditData = {
  id: string;
  rutaId: string;
  vehiculoId: string;
  conductorId: string;
  supervisorId: string | null;
  turno: TurnoEnum;
  planificacionTiempoInicio: string;
  planificacionTiempoFin: string;
  notas: string;
};

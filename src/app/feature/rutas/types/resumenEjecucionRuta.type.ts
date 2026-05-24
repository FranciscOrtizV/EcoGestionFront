import type { TurnoEnum } from '../../asignacionRutas/types/createAsignacionRutaRequest.type';

/** Respuesta de GET /ejecucion-rutas/:id/resumen */
export type ResumenEjecucionRutaDto = {
  nombreRuta: string;
  codigoRuta: string | null;
  nombreCompletoConductor: string;
  patenteVehiculo: string;
  marcaVehiculo: string | null;
  modeloVehiculo: string | null;
  estadoEjecucion: string | null;
  turno: TurnoEnum;
  planificacionTiempoInicio: Date | null;
  planificacionTiempoFin: Date | null;
  tiempoInicio: Date | null;
  tiempoTranscurrido: string | null;
};

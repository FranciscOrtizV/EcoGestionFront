import type { PuntoRutaLineaRequest } from './puntoRutaLineaRequest.type';

/** Cuerpo compatible con `UpdateRutaDto` del API (todos los campos opcionales). */
export type UpdateRutaRequest = {
  nombre?: string;
  codigo?: string;
  descripcion?: string;
  tipoRuta?: string;
  estimacionDuracionMinutos?: number;
  puntos?: PuntoRutaLineaRequest[];
};

import type { PuntoRutaLineaRequest } from './puntoRutaLineaRequest.type';

/** Cuerpo compatible con `CreateRutaDto` del API. */
export type CreateRutaRequest = {
  nombre: string;
  codigo?: string;
  descripcion?: string;
  tipoRuta?: string;
  estimacionDuracionMinutos?: number;
  puntos?: PuntoRutaLineaRequest[];
};

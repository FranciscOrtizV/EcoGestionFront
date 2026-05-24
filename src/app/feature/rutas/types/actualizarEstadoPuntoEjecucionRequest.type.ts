import type { EstadoEjecucionPuntoRutaEnum } from '../../../shared/enums/EstadoEjecucionPuntoRuta.enum';

export type ActualizarEstadoPuntoEjecucionRequest = {
  estado: EstadoEjecucionPuntoRutaEnum;
  comentarios?: string | null;
};

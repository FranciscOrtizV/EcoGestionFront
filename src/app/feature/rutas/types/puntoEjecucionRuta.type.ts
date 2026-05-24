import type { TipoPuntoColeccionEnum } from '../../puntosRecoleccion/enums/tipo-punto-coleccion.enum';
import type { EstadoEjecucionPuntoRutaEnum } from '../../../shared/enums/EstadoEjecucionPuntoRuta.enum';

/** Ítem de GET /ejecucion-rutas/:id/puntos */
export type PuntoEjecucionRutaItemDto = {
  id: string;
  nombre: string;
  direccion: string;
  nombreZona: string;
  estado: EstadoEjecucionPuntoRutaEnum;
  /** ISO 8601 desde el API (JSON no trae instancia `Date`). */
  tiempoChequeo: string | null;
  tipoPunto: TipoPuntoColeccionEnum;
  ordenSecuencia: number;
  latitud: number | null;
  longitud: number | null;
  comentarios: string | null;
  estimacionParadaMinutos: number | null;
};

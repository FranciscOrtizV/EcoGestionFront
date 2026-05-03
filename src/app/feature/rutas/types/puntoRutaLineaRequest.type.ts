/**
 * Línea de ruta al crear/actualizar (alinear con `PuntoRutaLineaDto` del backend).
 * Se usará cuando implementemos el editor de paradas.
 */
export type PuntoRutaLineaRequest = {
  puntoRecoleccionId: string;
  ordenSecuencia: number;
  estimacionParadaMinutos?: number;
};

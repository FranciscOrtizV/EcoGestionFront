/** Detalle de ruta para edición (incluye líneas de paradas ordenadas). */
export type RutaDetail = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  tipoRuta: string;
  estimacionDuracionMinutos: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  puntosLinea: RutaPuntoLineaDetail[];
};

export type RutaPuntoLineaDetail = {
  /** id de `PuntoRuta` en el API (solo informativo). */
  id: string;
  puntoRecoleccionId: string;
  ordenSecuencia: number;
  estimacionParadaMinutos?: number;
};

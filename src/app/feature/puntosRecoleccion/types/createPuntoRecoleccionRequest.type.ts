export type CreatePuntoRecoleccionRequest = {
  zonaId: string;
  nombre: string;
  direccion: string;
  referencia?: string;
  latitud: number;
  longitud: number;
  tipoPunto: string;
  prioridad?: number;
};

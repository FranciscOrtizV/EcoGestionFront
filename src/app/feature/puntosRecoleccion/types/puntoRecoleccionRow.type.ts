export type PuntoRecoleccionRow = {
  id: string;
  zonaId: string;
  zonaNombre: string;
  nombre: string;
  direccion: string;
  referencia: string | null;
  latitud: number;
  longitud: number;
  tipoPunto: string;
  prioridad: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

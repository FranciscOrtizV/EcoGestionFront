import type { IncidenciaEvidencia } from './incidenciaEvidencia.type';

export type IncidenciaUsuarioRef = {
  id: string;
  nombreCompleto: string;
};

export type IncidenciaDetalle = {
  id: string;
  titulo: string;
  tipoIncidencia: { id: string; nombre: string };
  ruta: { id: string; nombre: string; codigo: string | null } | null;
  puntoRecoleccion: { id: string; nombre: string; direccion: string } | null;
  reportadoPor: IncidenciaUsuarioRef;
  resueltoPor: IncidenciaUsuarioRef | null;
  descripcion: string | null;
  estado: string;
  prioridad: string;
  latitud: number | null;
  longitud: number | null;
  fechaReporte: string | null;
  evidencias: IncidenciaEvidencia[];
};

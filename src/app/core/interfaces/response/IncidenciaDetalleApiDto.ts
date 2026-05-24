import type { IncidenciaEvidenciaApiDto } from './IncidenciaEvidenciaApiDto';

export type IncidenciaUsuarioRefApiDto = {
  id: string;
  nombreCompleto: string;
};

/** GET /incidencias/:id */
export type IncidenciaDetalleApiDto = {
  id: string;
  titulo: string;
  tipoIncidencia: { id: string; nombre: string };
  ruta: { id: string; nombre: string; codigo: string | null } | null;
  puntoRecoleccion: { id: string; nombre: string; direccion: string } | null;
  reportadoPor: IncidenciaUsuarioRefApiDto;
  resueltoPor: IncidenciaUsuarioRefApiDto | null;
  descripcion: string | null;
  estado: string;
  prioridad: string;
  latitud: number;
  longitud: number;
  fechaReporte?: string;
  evidencias?: IncidenciaEvidenciaApiDto[];
};

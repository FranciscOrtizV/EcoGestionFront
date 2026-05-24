export type IncidenciaListItemApiDto = {
  id: string;
  tipoIncidencia: { id: string; nombre: string };
  ruta: { id: string; nombre: string; codigo: string | null } | null;
  puntoRecoleccion: { id: string; nombre: string; direccion: string } | null;
  reportadoPor: { id: string; nombreCompleto: string };
  titulo: string;
  descripcion: string | null;
  estado: string;
  prioridad: string;
  fechaReporte: string;
};

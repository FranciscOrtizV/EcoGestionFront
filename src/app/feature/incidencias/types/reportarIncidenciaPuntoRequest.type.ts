import type { PrioridadIncidenciaEnum } from '../../../shared/enums/PrioridadIncidencia.enum';

export type ReportarIncidenciaPuntoRequest = {
  puntoRutaEjecucionId: string;
  tipoIncidenciaId: string;
  titulo: string;
  descripcion: string;
  prioridad: PrioridadIncidenciaEnum;
  latitud: number;
  longitud: number;
  evidenciaFoto?: string | null;
};

import type { EstadoResolucionIncidenciaEnum } from '../../../shared/enums/EstadoResolucionIncidencia.enum';

export type ResolverIncidenciaRequest = {
  estado: EstadoResolucionIncidenciaEnum;
  comentarioResolucion: string;
};

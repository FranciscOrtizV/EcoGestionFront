import { EstadoVehiculoEnum } from '../../../shared/enums';

/** Alineado con `CreateVehiculoDto` de Nest. */
export interface CreateVehiculoRequest {
  patente: string;
  codigoInterno?: string;
  marca?: string;
  modelo?: string;
  anioVehiculo?: number;
  capacidadKg?: number;
  capacidadM3?: number;
  estado?: EstadoVehiculoEnum;
}

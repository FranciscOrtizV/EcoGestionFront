import { EstadoVehiculoEnum } from '../../../shared/enums';

/** Alineado con `UpdateVehiculoDto` de Nest; solo enviar propiedades que cambian. */
export interface UpdateVehiculoRequest {
  patente?: string;
  codigoInterno?: string | null;
  marca?: string | null;
  modelo?: string | null;
  anioVehiculo?: number | null;
  capacidadKg?: number | null;
  capacidadM3?: number | null;
  estado?: EstadoVehiculoEnum;
}

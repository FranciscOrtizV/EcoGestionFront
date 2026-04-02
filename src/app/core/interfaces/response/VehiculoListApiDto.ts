export interface VehiculoListApiDto {
  id:            string,
  patente:       string,
  codigoInterno: string,
  marca:         string,
  modelo:        string,
  anioVehiculo:  number,
  capacidadKg:   string,
  capacidadM3:   string,
  estado:        string,
  isActive:      boolean,
  createdAt:     Date,
  updatedAt:     Date
}

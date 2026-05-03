
export enum TipoPuntoColeccionEnum {
  DOMICILIARIO = 'DOMICILIARIO',
  CONTENEDOR = 'CONTENEDOR',
  PUNTO_CRITICO = 'PUNTO_CRITICO',
}

export const TIPO_PUNTO_COLECCION_LABELS: Record<TipoPuntoColeccionEnum, string> = {
  [TipoPuntoColeccionEnum.DOMICILIARIO]: 'Domiciliario',
  [TipoPuntoColeccionEnum.CONTENEDOR]: 'Contenedor',
  [TipoPuntoColeccionEnum.PUNTO_CRITICO]: 'Punto crítico',
};

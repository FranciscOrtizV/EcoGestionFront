/** Fila derivada del listado de rutas para la tabla de administración. */
export type RutaRow = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  tipoRuta: string;
  estimacionDuracionMinutos: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  paradasCount: number;
  /** Nombres de puntos ordenados por `ordenSecuencia` (texto compacto). */
  paradasResumen: string;
};

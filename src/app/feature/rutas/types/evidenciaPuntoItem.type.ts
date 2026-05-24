/** Ítem de evidencia fotográfica asociada a un punto de ejecución (GET /ejecucion-rutas/:id/puntos). */
export type EvidenciaPuntoItemDto = {
  id: string;
  fileUrl: string;
  /** URL absoluta lista para usar en `<img src>`. */
  urlFoto: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number | null;
  latitud: number | null;
  longitud: number | null;
  /** ISO 8601 */
  takenAt: string | null;
  /** ISO 8601 */
  createdAt: string;
  origen: 'PUNTO' | 'INCIDENCIA';
};

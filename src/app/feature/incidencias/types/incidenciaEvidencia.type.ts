export type IncidenciaEvidencia = {
  id: string;
  fileUrl: string;
  /** URL absoluta lista para `<img src>`. */
  urlFoto: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number | null;
  latitud: number | null;
  longitud: number | null;
  takenAt: string | null;
  createdAt: string;
};

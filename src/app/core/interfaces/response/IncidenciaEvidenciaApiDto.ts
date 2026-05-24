export type IncidenciaEvidenciaApiDto = {
  id: string;
  fileUrl: string;
  urlFoto: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number | null;
  latitud: number | null;
  longitud: number | null;
  takenAt: string | null;
  createdAt: string;
};

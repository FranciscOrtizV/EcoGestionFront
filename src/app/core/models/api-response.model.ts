/**
 * Envelope estándar del backend Nest (statusCode, message, data).
 * `T` es el contenido variable de `data` según el endpoint.
 */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

/** Extrae `data` del envelope (útil tras un get/post tipado como ApiResponse<T>). */
export function unwrapApiData<T>(res: ApiResponse<T>): T {
  return res.data;
}

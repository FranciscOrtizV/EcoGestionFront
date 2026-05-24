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

/** Falla si el backend respondió con un `statusCode` de error en el envelope (HTTP puede ser 200). */
export function assertApiSuccess(res: ApiResponse<unknown>): void {
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(res.message || 'La operación no se completó.');
  }
}

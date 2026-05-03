/** Presentación: reemplaza `_` por espacios (el API puede usar snake_case). */
export function formatNombreParaTabla(nombre: string): string {
  return nombre.replace(/_/g, ' ');
}

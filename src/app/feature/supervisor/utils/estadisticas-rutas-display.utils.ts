import { EstadoEjecucionRutaEnum } from '../../../shared/enums/EstadoEjecucionRutaEnum';

const ESTADO_EJECUCION_LABELS: Record<EstadoEjecucionRutaEnum, string> = {
  [EstadoEjecucionRutaEnum.NO_INICIADO]: 'No iniciado',
  [EstadoEjecucionRutaEnum.EN_PROCESO]: 'En proceso',
  [EstadoEjecucionRutaEnum.COMPLETADO]: 'Completado',
  [EstadoEjecucionRutaEnum.PARCIAL]: 'Parcial',
  [EstadoEjecucionRutaEnum.CANCELADO]: 'Cancelado',
};

export function labelEstadoEjecucionRuta(estado: EstadoEjecucionRutaEnum): string {
  return ESTADO_EJECUCION_LABELS[estado] ?? estado;
}

export function formatPorcentajeMetrica(valor: number | null): string {
  if (valor == null) return '—';
  return `${valor.toFixed(1)}%`;
}

export function formatKilometrosPromedio(valor: number | null): string {
  if (valor == null) return '—';
  return `${valor.toFixed(1)} km`;
}

export function formatFechaCorta(iso: string): string {
  const datePart = iso.split('T')[0] ?? iso;
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

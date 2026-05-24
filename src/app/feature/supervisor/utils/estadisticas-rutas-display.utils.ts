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

const ESTADO_PUNTO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  COMPLETADO: 'Completado',
  SALTADO: 'Saltado',
  FALLIDO: 'Fallido',
};

export function labelEstadoEjecucionPunto(estado: string): string {
  return ESTADO_PUNTO_LABELS[estado] ?? estado;
}

export function formatMinutosPromedio(valor: number | null): string {
  if (valor == null) return '—';
  return `${valor.toFixed(0)} min`;
}

export function formatKilometrosEntero(valor: number | null): string {
  if (valor == null) return '—';
  return `${Math.round(valor)} km`;
}

import { PrioridadIncidenciaEnum } from '../../../shared/enums/PrioridadIncidencia.enum';
import type { IncidenciaListItem } from '../types/incidenciaListItem.type';

const ESTADOS_CERRADOS = new Set(['RESUELTA', 'CERRADA', 'CANCELADA']);

const PRIORIDAD_LABEL: Record<string, string> = {
  [PrioridadIncidenciaEnum.BAJA]: 'Baja',
  [PrioridadIncidenciaEnum.MEDIA]: 'Media',
  [PrioridadIncidenciaEnum.ALTA]: 'Alta',
  [PrioridadIncidenciaEnum.CRITICA]: 'Crítica',
};

const ESTADO_LABEL: Record<string, string> = {
  ABIERTA: 'Abierta',
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En revisión',
  EN_PROCESO: 'En proceso',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
};

export function normalizeIncidenciaCodigo(value: string): string {
  return value.trim().toUpperCase();
}

export function labelPrioridadIncidencia(prioridad: string): string {
  const key = normalizeIncidenciaCodigo(prioridad);
  return PRIORIDAD_LABEL[key] ?? prioridad;
}

export function labelEstadoIncidencia(estado: string): string {
  const key = normalizeIncidenciaCodigo(estado);
  return ESTADO_LABEL[key] ?? estado;
}

export function labelTipoIncidenciaNombre(nombre: string): string {
  return nombre.trim().replace(/_/g, ' ');
}

export function formatFechaReporteIncidencia(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

export function rutaIncidenciaLabel(ruta: IncidenciaListItem['ruta']): string {
  if (!ruta) return '—';
  const codigo = ruta.codigo?.trim();
  return codigo ? `${ruta.nombre} (${codigo})` : ruta.nombre;
}

export function puntoIncidenciaLabel(punto: IncidenciaListItem['puntoRecoleccion']): string {
  if (!punto) return '—';
  return punto.nombre;
}

export function isIncidenciaEstadoAbierto(estado: string): boolean {
  return !ESTADOS_CERRADOS.has(normalizeIncidenciaCodigo(estado));
}

export function isIncidenciaPrioridadAlta(prioridad: string): boolean {
  const p = normalizeIncidenciaCodigo(prioridad);
  return p === PrioridadIncidenciaEnum.ALTA || p === PrioridadIncidenciaEnum.CRITICA;
}

export function prioridadIncidenciaBadgeClass(label: string): string {
  switch (label) {
    case 'Crítica':
      return 'badge-error';
    case 'Alta':
      return 'badge-warning';
    case 'Media':
      return 'badge-info';
    case 'Baja':
      return 'badge-ghost';
    default:
      return 'badge-ghost';
  }
}

export function estadoIncidenciaBadgeClass(label: string): string {
  switch (label) {
    case 'Resuelta':
    case 'Cerrada':
      return 'badge-success';
    case 'Abierta':
    case 'En revisión':
    case 'En proceso':
      return 'badge-warning';
    case 'Pendiente':
      return 'badge-info';
    case 'Cancelada':
      return 'badge-error';
    default:
      return 'badge-ghost';
  }
}

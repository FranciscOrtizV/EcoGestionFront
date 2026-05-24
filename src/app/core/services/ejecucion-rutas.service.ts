import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { TurnoEnum } from '../../feature/asignacionRutas/types/createAsignacionRutaRequest.type';
import {
  TipoPuntoColeccionEnum,
} from '../../feature/puntosRecoleccion/enums/tipo-punto-coleccion.enum';
import type { ActualizarEstadoPuntoEjecucionRequest } from '../../feature/rutas/types/actualizarEstadoPuntoEjecucionRequest.type';
import type { IniciarEjecucionRutaRequest } from '../../feature/rutas/types/iniciarEjecucionRutaRequest.type';
import type { PuntoEjecucionRutaItemDto } from '../../feature/rutas/types/puntoEjecucionRuta.type';
import type { ResumenEjecucionRutaDto } from '../../feature/rutas/types/resumenEjecucionRuta.type';
import { EstadoEjecucionPuntoRutaEnum } from '../../shared/enums/EstadoEjecucionPuntoRuta.enum';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function payloadEnvelopeObject(
  res: unknown,
  hasRootFields: (o: Record<string, unknown>) => boolean,
): Record<string, unknown> {
  if (!isRecord(res)) {
    throw new Error('Respuesta inválida');
  }
  if (hasRootFields(res)) {
    return res;
  }
  const nested = res['data'];
  if (isRecord(nested) && hasRootFields(nested)) {
    return nested;
  }
  throw new Error('Formato de respuesta no reconocido');
}

function payloadEnvelopeArray(
  res: unknown,
  hasItemFields: (o: Record<string, unknown>) => boolean,
): Record<string, unknown>[] {
  if (Array.isArray(res)) {
    return res.filter(isRecord);
  }
  if (!isRecord(res)) {
    throw new Error('Respuesta inválida');
  }
  const nested = res['data'];
  if (Array.isArray(nested)) {
    return nested.filter(isRecord);
  }
  if (isRecord(nested) && hasItemFields(nested)) {
    return [nested];
  }
  if (hasItemFields(res)) {
    return [res];
  }
  throw new Error('Formato de lista no reconocido');
}

function pickStr(o: Record<string, unknown>, camel: string, snake: string, fallback = ''): string {
  const v = o[camel] ?? o[snake];
  if (v === null || v === undefined) {
    return fallback;
  }
  return String(v);
}

function pickNullStr(o: Record<string, unknown>, camel: string, snake: string): string | null {
  const v = o[camel] ?? o[snake];
  if (v === null || v === undefined) {
    return null;
  }
  const s = String(v).trim();
  return s === '' ? null : s;
}

function pickNum(o: Record<string, unknown>, camel: string, snake: string): number | null {
  const v = o[camel] ?? o[snake];
  if (v === null || v === undefined || v === '') {
    return null;
  }
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

function pickIsoDate(o: Record<string, unknown>, camel: string, snake: string): string | null {
  const v = o[camel] ?? o[snake];
  if (v === null || v === undefined || v === '') {
    return null;
  }
  return String(v);
}

function pickDate(o: Record<string, unknown>, camel: string, snake: string): Date | null {
  const v = o[camel] ?? o[snake];
  if (v === null || v === undefined || v === '') {
    return null;
  }
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v;
  }
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function coerceEnumValue<T extends string>(v: unknown, values: readonly T[], fallback: T): T {
  const s = String(v ?? '')
    .trim()
    .toUpperCase() as T;
  return values.includes(s) ? s : fallback;
}

function coerceTurno(v: unknown): TurnoEnum {
  const s = String(v ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (s === 'MANANA' || s === 'AM') {
    return 'MANANA';
  }
  if (s === 'TARDE' || s === 'PM') {
    return 'TARDE';
  }
  if (s === 'NOCHE') {
    return 'NOCHE';
  }
  return 'MANANA';
}

function mapPayloadToResumenDto(raw: Record<string, unknown>): ResumenEjecucionRutaDto {
  return {
    nombreRuta: pickStr(raw, 'nombreRuta', 'nombre_ruta'),
    codigoRuta: pickNullStr(raw, 'codigoRuta', 'codigo_ruta'),
    nombreCompletoConductor: pickStr(raw, 'nombreCompletoConductor', 'nombre_completo_conductor'),
    patenteVehiculo: pickStr(raw, 'patenteVehiculo', 'patente_vehiculo'),
    marcaVehiculo: pickNullStr(raw, 'marcaVehiculo', 'marca_vehiculo'),
    modeloVehiculo: pickNullStr(raw, 'modeloVehiculo', 'modelo_vehiculo'),
    estadoEjecucion: pickNullStr(raw, 'estadoEjecucion', 'estado_ejecucion'),
    turno: coerceTurno(raw['turno']),
    planificacionTiempoInicio: pickDate(
      raw,
      'planificacionTiempoInicio',
      'planificacion_tiempo_inicio',
    ),
    planificacionTiempoFin: pickDate(raw, 'planificacionTiempoFin', 'planificacion_tiempo_fin'),
    tiempoInicio: pickDate(raw, 'tiempoInicio', 'tiempo_inicio'),
    tiempoTranscurrido: pickNullStr(raw, 'tiempoTranscurrido', 'tiempo_transcurrido'),
  };
}

function mapPayloadToPuntoDto(raw: Record<string, unknown>): PuntoEjecucionRutaItemDto {
  const orden =
    pickNum(raw, 'ordenSecuencia', 'orden_secuencia') ??
    pickNum(raw, 'orden', 'orden') ??
    0;

  const nombreZona =
    pickStr(raw, 'nombreZona', 'nombre_zona') ||
    pickNullStr(raw, 'zonaNombre', 'zona_nombre') ||
    '';

  return {
    id: pickStr(raw, 'id', 'id'),
    nombre: pickStr(raw, 'nombre', 'nombre') || pickStr(raw, 'nombrePunto', 'nombre_punto'),
    direccion: pickStr(raw, 'direccion', 'direccion'),
    nombreZona,
    estado: coerceEnumValue(
      raw['estado'],
      Object.values(EstadoEjecucionPuntoRutaEnum) as EstadoEjecucionPuntoRutaEnum[],
      EstadoEjecucionPuntoRutaEnum.PENDIENTE,
    ),
    tiempoChequeo: pickIsoDate(raw, 'tiempoChequeo', 'tiempo_chequeo'),
    tipoPunto: coerceEnumValue(
      raw['tipoPunto'] ?? raw['tipo_punto'],
      Object.values(TipoPuntoColeccionEnum) as TipoPuntoColeccionEnum[],
      TipoPuntoColeccionEnum.DOMICILIARIO,
    ),
    ordenSecuencia: orden,
    latitud: pickNum(raw, 'latitud', 'latitud'),
    longitud: pickNum(raw, 'longitud', 'longitud'),
    comentarios: pickNullStr(raw, 'comentarios', 'comentarios'),
    estimacionParadaMinutos: pickNum(raw, 'estimacionParadaMinutos', 'estimacion_parada_minutos'),
  };
}

const tieneCamposResumen = (o: Record<string, unknown>) =>
  'nombreRuta' in o || 'nombre_ruta' in o;

const tieneCamposPunto = (o: Record<string, unknown>) =>
  'ordenSecuencia' in o ||
  'orden_secuencia' in o ||
  'orden' in o ||
  ('nombre' in o && ('direccion' in o || 'estado' in o));

@Injectable({ providedIn: 'root' })
export class EjecucionRutasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ejecucion-rutas`;

  getResumenPorId(id: string): Observable<ResumenEjecucionRutaDto> {
    return this.http.get<unknown>(`${this.base}/${id}/resumen`).pipe(
      map((body) => mapPayloadToResumenDto(payloadEnvelopeObject(body, tieneCamposResumen))),
    );
  }

  getPuntosPorId(id: string): Observable<PuntoEjecucionRutaItemDto[]> {
    return this.http.get<unknown>(`${this.base}/${id}/puntos`).pipe(
      map((body) =>
        payloadEnvelopeArray(body, tieneCamposPunto)
          .map((item) => mapPayloadToPuntoDto(item))
          .sort((a, b) => a.ordenSecuencia - b.ordenSecuencia),
      ),
    );
  }

  iniciar(id: string, body: IniciarEjecucionRutaRequest): Observable<void> {
    return this.http.patch<unknown>(`${this.base}/${id}/iniciar`, body).pipe(map(() => undefined));
  }

  actualizarEstadoPunto(
    ejecucionRutaId: string,
    puntoId: string,
    body: ActualizarEstadoPuntoEjecucionRequest,
  ): Observable<void> {
    return this.http
      .patch<unknown>(`${this.base}/${ejecucionRutaId}/puntos/${puntoId}`, body)
      .pipe(map(() => undefined));
  }
}

import { NgClass } from '@angular/common';
import { Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { toast } from 'ngx-sonner';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { EjecucionRutasService } from '../../../../core/services/ejecucion-rutas.service';
import { LoadingService } from '../../../../core/services/loading.service';
import type { TurnoEnum } from '../../../asignacionRutas/types/createAsignacionRutaRequest.type';
import type { PuntoEjecucionRutaItemDto } from '../../../rutas/types/puntoEjecucionRuta.type';
import type { ResumenEjecucionRutaDto } from '../../../rutas/types/resumenEjecucionRuta.type';
import {
  TIPO_PUNTO_COLECCION_LABELS,
  TipoPuntoColeccionEnum,
} from '../../../puntosRecoleccion/enums/tipo-punto-coleccion.enum';
import { EstadoEjecucionPuntoRutaEnum } from '../../../../shared/enums/EstadoEjecucionPuntoRuta.enum';
import {
  MapPuntosListaComponent,
  type MapaPuntoMarcador,
} from '../../../../shared/components/map-puntos-lista/map-puntos-lista.component';
import { ActualizarEstadoPuntoModalComponent } from '../../components/actualizar-estado-punto-modal/actualizar-estado-punto-modal.component';
import { IniciarRutaModalComponent } from '../../components/iniciar-ruta-modal/iniciar-ruta-modal.component';
import { ReportarIncidenciaPuntoModalComponent } from '../../components/reportar-incidencia-punto-modal/reportar-incidencia-punto-modal.component';
import { EstadoEjecucionRutaEnum } from '../../../../shared/enums/EstadoEjecucionRutaEnum';

const TURNO_LABELS: Record<TurnoEnum, string> = {
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  NOCHE: 'Noche',
};

function labelTurno(turno: TurnoEnum | null | undefined): string {
  if (!turno) {
    return '—';
  }
  return TURNO_LABELS[turno];
}

/** `true` si `ahora` está dentro de [inicio, fin] (ambos inclusive). */
function estaEnVentanaPlanificacion(
  inicio: Date | null | undefined,
  fin: Date | null | undefined,
  ahora: Date = new Date(),
): boolean {
  if (!inicio || !fin) {
    return false;
  }
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    return false;
  }
  const t = ahora.getTime();
  return t >= inicio.getTime() && t <= fin.getTime();
}

function clasesBadgeEstadoEjecucion(estadoRaw: string | null | undefined): {
  wrap: readonly string[];
  dot: readonly string[];
} {
  const c = (estadoRaw ?? '').trim().toUpperCase();
  if (c === EstadoEjecucionRutaEnum.NO_INICIADO || c === 'NO_INCIIADO') {
    return {
      wrap: ['bg-base-300/50', 'text-base-content'],
      dot: ['bg-base-content/45'],
    };
  }
  if (c === EstadoEjecucionRutaEnum.EN_PROCESO || c === 'EN_PROGRESO') {
    return { wrap: ['bg-info/20', 'text-info-content'], dot: ['bg-info'] };
  }
  if (c === 'COMPLETADO') {
    return { wrap: ['bg-success/20', 'text-success-content'], dot: ['bg-success'] };
  }
  if (c === 'PARCIAL') {
    return { wrap: ['bg-warning/20', 'text-warning-content'], dot: ['bg-warning'] };
  }
  if (c === 'CANCELADO') {
    return { wrap: ['bg-error/20', 'text-error-content'], dot: ['bg-error'] };
  }
  return {
    wrap: ['bg-base-300/40', 'text-base-content/70'],
    dot: ['bg-base-content/40'],
  };
}

/** Vista del encabezado: ruta, conductor, vehículo y turno vienen del resumen API. */
type EncabezadoEjecucionVista = {
  nombre: string;
  codigo: string;
  estadoLabel: string;
  estadoBadgeWrapClass: readonly string[];
  estadoBadgeDotClass: readonly string[];
  conductorNombre: string;
  vehiculoPatente: string;
  turnoLabel: string;
  puntosCompletados: number;
  puntosTotal: number;
  progresoPct: number;
};

type EstadoPuntoMaquetacion =
  | 'completado'
  | 'en_atencion'
  | 'pendiente'
  | 'saltado'
  | 'fallido';

type PuntoRecoleccionVista = {
  id: string;
  orden: number;
  nombre: string;
  direccion: string;
  zona: string;
  tipoPuntoLabel: string;
  estimacionParadaMinutos: number | null;
  comentarios: string | null;
  tiempoChequeo: string | null;
  latitud: number | null;
  longitud: number | null;
  estado: EstadoPuntoMaquetacion;
  estadoApi: EstadoEjecucionPuntoRutaEnum;
};

function mapEstadoPuntoVista(estadoApi: EstadoEjecucionPuntoRutaEnum): EstadoPuntoMaquetacion {
  if (estadoApi === EstadoEjecucionPuntoRutaEnum.COMPLETADO) {
    return 'completado';
  }
  if (estadoApi === EstadoEjecucionPuntoRutaEnum.SALTADO) {
    return 'saltado';
  }
  if (estadoApi === EstadoEjecucionPuntoRutaEnum.FALLIDO) {
    return 'fallido';
  }
  return 'pendiente';
}

function labelTipoPunto(tipo: TipoPuntoColeccionEnum): string {
  return TIPO_PUNTO_COLECCION_LABELS[tipo] ?? tipo;
}

function mapPuntoDtoToVista(dto: PuntoEjecucionRutaItemDto): PuntoRecoleccionVista {
  return {
    id: dto.id,
    orden: dto.ordenSecuencia,
    nombre: dto.nombre,
    direccion: dto.direccion,
    zona: dto.nombreZona.trim() || '—',
    tipoPuntoLabel: labelTipoPunto(dto.tipoPunto),
    estimacionParadaMinutos: dto.estimacionParadaMinutos,
    comentarios: dto.comentarios,
    tiempoChequeo: dto.tiempoChequeo,
    latitud: dto.latitud,
    longitud: dto.longitud,
    estado: mapEstadoPuntoVista(dto.estado),
    estadoApi: dto.estado,
  };
}

@Component({
  selector: 'app-ejecucion-ruta-detalle',
  standalone: true,
  imports: [NgClass, RouterLink, MapPuntosListaComponent, IniciarRutaModalComponent, ActualizarEstadoPuntoModalComponent, ReportarIncidenciaPuntoModalComponent],
  templateUrl: './ejecucion-ruta-detalle.component.html',
  styleUrl: './ejecucion-ruta-detalle.component.css',
})
export class EjecucionRutaDetalleComponent {
  private readonly router = inject(Router);
  private readonly ejecucionRutasService = inject(EjecucionRutasService);
  private readonly loadingService = inject(LoadingService);

  readonly ejecucionRutaId = input.required<string>();

  /** Datos del GET /ejecucion-rutas/:id/resumen */
  protected readonly resumenApi = signal<ResumenEjecucionRutaDto | null>(null);
  protected readonly resumenError = signal(false);

  /** Datos del GET /ejecucion-rutas/:id/puntos */
  protected readonly puntosApi = signal<PuntoEjecucionRutaItemDto[]>([]);
  protected readonly puntosError = signal(false);
  protected readonly puntosCargando = signal(false);

  /** Oculta el pie de métricas mientras la ruta no ha sido iniciada. */
  protected readonly mostrarPieEjecucion = computed(() => {
    const estado = this.resumenApi()?.estadoEjecucion?.trim().toUpperCase();
    return estado != null && estado !== EstadoEjecucionRutaEnum.NO_INICIADO;
  });

  /** Acciones del punto solo cuando la ejecución está en curso. */
  protected readonly mostrarAccionesPunto = computed(() => {
    const estado = this.resumenApi()?.estadoEjecucion?.trim().toUpperCase();
    return estado === EstadoEjecucionRutaEnum.EN_PROCESO || estado === 'EN_PROGRESO';
  });

  /** Acciones del punto solo cuando la ejecución está en curso y el punto sigue pendiente. */
  protected mostrarAccionesPuntoDetalle(p: PuntoRecoleccionVista): boolean {
    return (
      this.mostrarAccionesPunto() && p.estadoApi === EstadoEjecucionPuntoRutaEnum.PENDIENTE
    );
  }

  protected readonly mostrarBotonIniciarRuta = computed(() => {
    const resumen = this.resumenApi();
    const estado = resumen?.estadoEjecucion?.trim().toUpperCase();
    const esNoIniciado =
      estado === EstadoEjecucionRutaEnum.NO_INICIADO || estado === 'NO_INCIIADO';
    if (!esNoIniciado) {
      return false;
    }
    return estaEnVentanaPlanificacion(
      resumen?.planificacionTiempoInicio,
      resumen?.planificacionTiempoFin,
    );
  });

  protected readonly mostrarBotonFinalizarRuta = computed(() => {
    const estado = this.resumenApi()?.estadoEjecucion?.trim().toUpperCase();
    return (
      estado === EstadoEjecucionRutaEnum.EN_PROCESO ||
      estado === 'EN_PROGRESO' ||
      estado === EstadoEjecucionRutaEnum.PARCIAL
    );
  });

  protected readonly mostrarBotonReportarIncidenciaGeneral = computed(
    () => this.mostrarBotonFinalizarRuta(),
  );

  protected readonly mostrarAccionesEncabezadoRuta = computed(
    () =>
      this.mostrarBotonIniciarRuta() ||
      this.mostrarBotonFinalizarRuta() ||
      this.mostrarBotonReportarIncidenciaGeneral(),
  );

  constructor() {
    toObservable(this.ejecucionRutaId)
      .pipe(
        switchMap((id) => {
          this.resumenApi.set(null);
          this.resumenError.set(false);
          this.puntosApi.set([]);
          this.puntosError.set(false);
          this.puntosCargando.set(true);
          this.loadingService.setLoading(true);

          return forkJoin({
            resumen: this.ejecucionRutasService.getResumenPorId(id).pipe(
              catchError(() => {
                this.resumenError.set(true);
                toast.error('No se pudo cargar el resumen de la ejecución.');
                return of(null);
              }),
            ),
            puntos: this.ejecucionRutasService.getPuntosPorId(id).pipe(
              catchError(() => {
                this.puntosError.set(true);
                toast.error('No se pudieron cargar los puntos de la ruta.');
                return of([] as PuntoEjecucionRutaItemDto[]);
              }),
            ),
          }).pipe(
            finalize(() => {
              this.loadingService.setLoading(false);
              this.puntosCargando.set(false);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ resumen, puntos }) => {
        if (resumen) {
          this.resumenApi.set(resumen);
        }
        this.puntosApi.set(puntos);
      });
  }

  /** Punto cuyo detalle se muestra en el panel lateral; `null` = cerrado. */
  protected readonly puntoDetalleSidebar = signal<PuntoRecoleccionVista | null>(null);

  /** Modal para registrar odómetro y ubicación al iniciar la ruta. */
  protected readonly modalIniciarRutaAbierto = signal(false);
   /** Modal placeholder para finalizar ruta (formulario pendiente). */
   protected readonly modalFinalizarRutaAbierto = signal(false);

  /** Contexto del modal para actualizar estado/comentarios de un punto. */
  protected readonly modalActualizarEstadoPunto = signal<{
    puntoId: string;
    puntoNombre: string;
    estadoInicial: EstadoEjecucionPuntoRutaEnum;
    comentariosIniciales: string | null;
    estadoPredeterminado: EstadoEjecucionPuntoRutaEnum | null;
  } | null>(null);

  /** Contexto del modal para reportar incidencia en un punto. */
  protected readonly modalReportarIncidenciaPunto = signal<{
    puntoId: string;
    puntoNombre: string;
    latitud: number | null;
    longitud: number | null;
  } | null>(null);

  /** Valores de ejemplo en la sección evidencia (maquetación). */
  protected readonly evidenciaEjemplo = {
    geo: '19.432608, -99.133209',
    fecha: '24/05/2024',
    hora: '10:42 a. m.',
  } as const;

  readonly puntosRecoleccion = computed((): PuntoRecoleccionVista[] =>
    this.puntosApi().map((dto) => mapPuntoDtoToVista(dto)),
  );

  readonly totalPuntosRuta = computed(() => this.puntosRecoleccion().length);

  readonly resumenPuntos = computed(() => {
    const puntos = this.puntosRecoleccion();
    return {
      completados: puntos.filter((p) => p.estado === 'completado').length,
      pendientes: puntos.filter((p) => p.estado === 'pendiente' || p.estado === 'en_atencion').length,
      saltados: puntos.filter((p) => p.estado === 'saltado').length,
      fallidos: puntos.filter((p) => p.estado === 'fallido').length,
    };
  });

  readonly encabezado = computed((): EncabezadoEjecucionVista => {
    const r = this.resumenApi();
    const total = this.totalPuntosRuta();
    const completados = this.resumenPuntos().completados;
    const progresoPct = total > 0 ? Math.round((completados / total) * 100) : 0;

    if (!r) {
      const err = this.resumenError();
      const badgeIdle = clasesBadgeEstadoEjecucion(null);
      return {
        nombre: err ? 'No disponible' : 'Cargando…',
        codigo: '—',
        estadoLabel: '—',
        estadoBadgeWrapClass: badgeIdle.wrap,
        estadoBadgeDotClass: badgeIdle.dot,
        conductorNombre: '—',
        vehiculoPatente: '—',
        turnoLabel: '—',
        puntosCompletados: completados,
        puntosTotal: total,
        progresoPct,
      };
    }

    const marcaModelo = [r.marcaVehiculo, r.modeloVehiculo].filter(Boolean).join(' ').trim();
    const vehiculoLabel = marcaModelo ? `${marcaModelo} · ${r.patenteVehiculo}` : r.patenteVehiculo;
    const badge = clasesBadgeEstadoEjecucion(r.estadoEjecucion);

    return {
      nombre: r.nombreRuta,
      codigo: r.codigoRuta?.trim() || '—',
      estadoLabel: r.estadoEjecucion?.trim() || '—',
      estadoBadgeWrapClass: badge.wrap,
      estadoBadgeDotClass: badge.dot,
      conductorNombre: r.nombreCompletoConductor,
      vehiculoPatente: vehiculoLabel,
      turnoLabel: labelTurno(r.turno),
      puntosCompletados: completados,
      puntosTotal: total,
      progresoPct,
    };
  });

  /** Barra inferior de métricas desde el resumen API. */
  readonly pieEjecucion = computed(() => {
    const r = this.resumenApi();
    const completados = this.resumenPuntos().completados;
    const total = this.totalPuntosRuta();

    return {
      inicioRuta: r?.tiempoInicio
        ? r.tiempoInicio.toLocaleString('es-CL', { timeStyle: 'short' })
        : '—',
      tiempoTranscurrido: r?.tiempoTranscurrido?.trim() || '—',
      distanciaRecorrida: '—',
      puntosCompletados: `${completados} de ${total}`,
      notasRuta: 'Recolección programada sin novedades hasta el momento.',
    };
  });

  readonly marcadoresMapa = computed((): MapaPuntoMarcador[] => {
    const puntos = this.puntosRecoleccion();
    const { lat, lng } = environment.mapDefaultCenter;
    const step = 0.004;

    return puntos.map((p, i) => {
      const tieneCoords = p.latitud != null && p.longitud != null;
      return {
        orden: p.orden,
        lat: tieneCoords ? p.latitud! : lat + i * step * 0.6,
        lng: tieneCoords ? p.longitud! : lng + i * step,
        titulo: p.nombre,
        subtitulo: p.direccion,
      };
    });
  });

  protected trackPuntoRecoleccion(p: PuntoRecoleccionVista): string {
    return p.id;
  }

  protected textoEstimacionParada(p: PuntoRecoleccionVista): string {
    if (p.estimacionParadaMinutos == null) {
      return '—';
    }
    return `${p.estimacionParadaMinutos} min est.`;
  }

  protected formatoTiempoChequeo(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) {
      return '—';
    }
    return fecha.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  }

  protected volverAlListado(): void {
    void this.router.navigate(['/conductor', 'mis-rutas']);
  }

  @HostListener('document:keydown.escape')
  protected onEscapeCerrarPanel(): void {
    if (this.modalReportarIncidenciaPunto()) {
      this.cerrarModalReportarIncidenciaPunto();
      return;
    }
    if (this.modalFinalizarRutaAbierto()) {
      this.cerrarModalFinalizarRuta();
      return;
    }
    if (this.modalActualizarEstadoPunto()) {
      this.cerrarModalActualizarEstadoPunto();
      return;
    }
    if (this.modalIniciarRutaAbierto()) {
      this.cerrarModalIniciarRuta();
      return;
    }
    if (this.puntoDetalleSidebar() !== null) {
      this.cerrarDetallePunto();
    }
  }

  protected abrirModalIniciarRuta(): void {
    this.modalIniciarRutaAbierto.set(true);
  }

  protected cerrarModalIniciarRuta(): void {
    this.modalIniciarRutaAbierto.set(false);
  }

  protected onIntentarFinalizarRuta(): void {
    const tienePendientes = this.puntosApi().some(
      (p) => p.estado === EstadoEjecucionPuntoRutaEnum.PENDIENTE,
    );
    if (tienePendientes) {
      toast.warning(
        'No puedes finalizar la ruta mientras existan puntos pendientes.',
      );
      return;
    }

    this.modalFinalizarRutaAbierto.set(true);
  }

  protected cerrarModalFinalizarRuta(): void {
    this.modalFinalizarRutaAbierto.set(false);
  }

  protected onRutaIniciada(): void {
    this.modalIniciarRutaAbierto.set(false);
    this.recargarDatosEjecucion();
  }

  protected abrirModalActualizarEstadoPunto(
    p: PuntoRecoleccionVista,
    estadoPredeterminado: EstadoEjecucionPuntoRutaEnum,
  ): void {
    this.modalActualizarEstadoPunto.set({
      puntoId: p.id,
      puntoNombre: p.nombre,
      estadoInicial: p.estadoApi,
      comentariosIniciales: p.comentarios,
      estadoPredeterminado,
    });
  }

  protected abrirModalMarcarCompletado(p: PuntoRecoleccionVista): void {
    this.abrirModalActualizarEstadoPunto(p, EstadoEjecucionPuntoRutaEnum.COMPLETADO);
  }

  protected abrirModalSaltarPunto(p: PuntoRecoleccionVista): void {
    this.abrirModalActualizarEstadoPunto(p, EstadoEjecucionPuntoRutaEnum.SALTADO);
  }

  protected cerrarModalActualizarEstadoPunto(): void {
    this.modalActualizarEstadoPunto.set(null);
  }

  protected onEstadoPuntoActualizado(): void {
    this.modalActualizarEstadoPunto.set(null);
    const puntoId = this.puntoDetalleSidebar()?.id;
    this.recargarDatosEjecucion(puntoId);
  }

  protected abrirModalReportarIncidencia(p: PuntoRecoleccionVista): void {
    this.modalReportarIncidenciaPunto.set({
      puntoId: p.id,
      puntoNombre: p.nombre,
      latitud: p.latitud,
      longitud: p.longitud,
    });
  }

  protected cerrarModalReportarIncidenciaPunto(): void {
    this.modalReportarIncidenciaPunto.set(null);
  }

  protected onIncidenciaReportada(): void {
    this.modalReportarIncidenciaPunto.set(null);
  }

  private recargarDatosEjecucion(puntoDetalleId?: string): void {
    const id = this.ejecucionRutaId();
    this.puntosCargando.set(true);
    this.loadingService.setLoading(true);

    forkJoin({
      resumen: this.ejecucionRutasService.getResumenPorId(id).pipe(
        catchError(() => {
          this.resumenError.set(true);
          toast.error('No se pudo actualizar el resumen de la ejecución.');
          return of(null);
        }),
      ),
      puntos: this.ejecucionRutasService.getPuntosPorId(id).pipe(
        catchError(() => {
          this.puntosError.set(true);
          toast.error('No se pudieron actualizar los puntos de la ruta.');
          return of([] as PuntoEjecucionRutaItemDto[]);
        }),
      ),
    })
      .pipe(
        finalize(() => {
          this.loadingService.setLoading(false);
          this.puntosCargando.set(false);
        }),
      )
      .subscribe(({ resumen, puntos }) => {
        if (resumen) {
          this.resumenApi.set(resumen);
          this.resumenError.set(false);
        }
        this.puntosApi.set(puntos);
        if (puntoDetalleId) {
          const actualizado =
            puntos.map((dto) => mapPuntoDtoToVista(dto)).find((p) => p.id === puntoDetalleId) ??
            null;
          this.puntoDetalleSidebar.set(actualizado);
        }
      });
  }

  protected abrirDetallePunto(p: PuntoRecoleccionVista): void {
    this.puntoDetalleSidebar.set(p);
  }

  protected cerrarDetallePunto(): void {
    this.puntoDetalleSidebar.set(null);
  }

  protected direccionDetallePunto(p: PuntoRecoleccionVista): string {
    return p.direccion.trim();
  }

  protected textoOrdenEnRuta(p: PuntoRecoleccionVista): string {
    return `${p.orden} de ${this.totalPuntosRuta()}`;
  }

  protected labelEstado(estado: EstadoPuntoMaquetacion): string {
    const labels: Record<EstadoPuntoMaquetacion, string> = {
      completado: 'Completado',
      en_atencion: 'En atención',
      pendiente: 'Pendiente',
      saltado: 'Saltado',
      fallido: 'Fallido',
    };
    return labels[estado];
  }

  protected badgeClassEstado(estado: EstadoPuntoMaquetacion): string {
    const m: Record<EstadoPuntoMaquetacion, string> = {
      completado: 'badge-success',
      en_atencion: 'badge-info',
      pendiente: 'badge-ghost border border-base-300',
      saltado: 'badge-warning',
      fallido: 'badge-error',
    };
    return m[estado];
  }

  protected circuloEstadoClass(estado: EstadoPuntoMaquetacion): string {
    const m: Record<EstadoPuntoMaquetacion, string> = {
      completado: 'bg-success text-success-content',
      en_atencion: 'bg-info text-info-content',
      pendiente: 'bg-base-300 text-base-content',
      saltado: 'bg-warning text-warning-content',
      fallido: 'bg-error text-error-content',
    };
    return m[estado];
  }

  protected iconoEstadoDerecha(estado: EstadoPuntoMaquetacion): string {
    const m: Record<EstadoPuntoMaquetacion, string> = {
      completado: 'ri-check-line text-success',
      en_atencion: 'ri-arrow-right-s-line text-info',
      pendiente: 'ri-time-line text-base-content/50',
      saltado: 'ri-skip-forward-line text-warning',
      fallido: 'ri-timer-flash-line text-error',
    };
    return m[estado];
  }

  protected cardPuntoClass(estado: EstadoPuntoMaquetacion): string {
    if (estado === 'en_atencion') {
      return 'border-2 border-primary bg-primary/5 shadow-sm';
    }
    return 'border border-base-300 bg-base-100';
  }
}

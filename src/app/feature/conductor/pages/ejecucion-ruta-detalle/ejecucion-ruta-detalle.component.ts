import { NgClass } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import {
  MapPuntosListaComponent,
  type MapaPuntoMarcador,
} from '../../../../shared/components/map-puntos-lista/map-puntos-lista.component';

/** Datos de encabezado solo para maquetación; sustituir por modelo/API. */
type EncabezadoEjecucionVista = {
  nombre: string;
  codigo: string;
  estadoLabel: string;
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
  orden: number;
  nombre: string;
  direccion: string;
  distanciaMetros: number;
  estado: EstadoPuntoMaquetacion;
};

@Component({
  selector: 'app-ejecucion-ruta-detalle',
  standalone: true,
  imports: [NgClass, RouterLink, MapPuntosListaComponent],
  templateUrl: './ejecucion-ruta-detalle.component.html',
  styleUrl: './ejecucion-ruta-detalle.component.css',
})
export class EjecucionRutaDetalleComponent {
  private readonly router = inject(Router);

  readonly ejecucionRutaId = input.required<string>();

  readonly encabezado = computed((): EncabezadoEjecucionVista => ({
    nombre: 'Ruta Centro',
    codigo: 'RC-012',
    estadoLabel: 'En curso',
    conductorNombre: 'Francisco Ortiz Villarreal',
    vehiculoPatente: 'CAM-245',
    turnoLabel: 'Mañana (06:00 – 14:00)',
    puntosCompletados: 3,
    puntosTotal: 12,
    progresoPct: 25,
  }));

  /** Resumen para las tarjetas superiores del panel izquierdo. */
  readonly resumenPuntos = {
    completados: 3,
    pendientes: 7,
    saltados: 1,
    fallidos: 1,
  } as const;

  readonly totalPuntosRuta = 12;

  /** Barra inferior de métricas (maquetación). */
  readonly pieEjecucion = {
    inicioRuta: '06:12 a. m.',
    tiempoTranscurrido: '04:30:12',
    distanciaRecorrida: '18.6 km',
    puntosCompletados: '3 de 12',
    notasRuta: 'Recolección programada sin novedades hasta el momento.',
  } as const;

  /** Primeros puntos visibles en la lista (maquetación). */
  readonly puntosRecoleccion: readonly PuntoRecoleccionVista[] = [
    {
      orden: 1,
      nombre: 'Mercado municipal Norte',
      direccion: 'Av. Principal 120, sector norte',
      distanciaMetros: 85,
      estado: 'completado',
    },
    {
      orden: 2,
      nombre: 'Centro de salud familiar',
      direccion: 'Calle Los Aromos 45',
      distanciaMetros: 200,
      estado: 'completado',
    },
    {
      orden: 3,
      nombre: 'Plaza de la ciudad',
      direccion: 'Esquina Independencia / O’Higgins',
      distanciaMetros: 150,
      estado: 'completado',
    },
    {
      orden: 4,
      nombre: 'Escuela Primaria Benito Juárez',
      direccion: 'Pasaje Los Robles 88',
      distanciaMetros: 120,
      estado: 'en_atencion',
    },
    {
      orden: 5,
      nombre: 'Condominio Los Almendros',
      direccion: 'Av. Circunvalación 2100',
      distanciaMetros: 340,
      estado: 'pendiente',
    },
    {
      orden: 6,
      nombre: 'Bodega industrial Sur',
      direccion: 'Ruta K-12 km 3.5',
      distanciaMetros: 500,
      estado: 'saltado',
    },
    {
      orden: 7,
      nombre: 'Terminal de buses',
      direccion: 'Av. Costanera 300',
      distanciaMetros: 90,
      estado: 'fallido',
    },
  ];

  readonly marcadoresMapa = computed((): MapaPuntoMarcador[] => {
    const { lat, lng } = environment.mapDefaultCenter;
    const step = 0.004;
    return this.puntosRecoleccion.map((p, i) => ({
      orden: p.orden,
      lat: lat + i * step * 0.6,
      lng: lng + i * step,
      titulo: p.nombre,
      subtitulo: p.direccion,
    }));
  });

  protected volverAlListado(): void {
    void this.router.navigate(['/conductor', 'mis-rutas']);
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

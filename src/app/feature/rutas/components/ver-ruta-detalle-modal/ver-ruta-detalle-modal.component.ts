import { NgClass } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { toast } from 'ngx-sonner';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { PuntosRecoleccionService } from '../../../../core/services/puntos-recoleccion.service';
import { RutasService } from '../../../../core/services/rutas.service';
import {
  MapPuntosListaComponent,
  type MapaPuntoMarcador,
} from '../../../../shared/components/map-puntos-lista/map-puntos-lista.component';
import type { PuntoRecoleccionRow } from '../../../puntosRecoleccion/types';
import { TIPO_RUTA_LABELS } from '../../enums/tipo-ruta.enum';
import type { RutaDetail } from '../../types';

type ParadaDetalleVista = {
  orden: number;
  puntoRecoleccionId: string;
  nombre: string;
  zonaNombre: string;
  direccion: string;
  estimacionParadaMinutos?: number;
  lat: number;
  lng: number;
  /** true si no estaba en el catálogo de puntos (p. ej. dado de baja). */
  datosIncompletos: boolean;
};

@Component({
  selector: 'app-ver-ruta-detalle-modal',
  standalone: true,
  imports: [NgClass, MapPuntosListaComponent],
  templateUrl: './ver-ruta-detalle-modal.component.html',
})
export class VerRutaDetalleModalComponent implements OnInit {
  private readonly rutasService = inject(RutasService);
  private readonly puntosService = inject(PuntosRecoleccionService);

  readonly rutaId = input.required<string>();

  closed = output<void>();

  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly ruta = signal<RutaDetail | null>(null);
  protected readonly paradasVista = signal<ParadaDetalleVista[]>([]);

  protected readonly marcadoresMapa = computed<MapaPuntoMarcador[]>(() =>
    this.paradasVista()
      .filter((p) => !p.datosIncompletos && Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => ({
        lat: p.lat,
        lng: p.lng,
        orden: p.orden,
        titulo: p.nombre,
        subtitulo: `${p.zonaNombre} · ${p.direccion}`,
      })),
  );

  ngOnInit(): void {
    const id = this.rutaId();
    this.loading.set(true);
    this.loadError.set(false);

    forkJoin({
      ruta: this.rutasService.getById(id).pipe(
        catchError(() => {
          toast.error('No se pudo cargar el detalle de la ruta.');
          return of(null);
        }),
      ),
      puntos: this.puntosService.findAll().pipe(
        catchError(() => {
          toast.error('No se pudieron cargar los puntos de recolección.');
          return of([] as PuntoRecoleccionRow[]);
        }),
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(({ ruta, puntos }) => {
        if (!ruta) {
          this.loadError.set(true);
          return;
        }
        this.ruta.set(ruta);
        const byId = new Map(puntos.map((p) => [p.id, p]));
        const lineas = [...ruta.puntosLinea].sort((a, b) => a.ordenSecuencia - b.ordenSecuencia);
        const vistas: ParadaDetalleVista[] = lineas.map((l) => {
          const pr = byId.get(l.puntoRecoleccionId);
          if (!pr) {
            return {
              orden: l.ordenSecuencia,
              puntoRecoleccionId: l.puntoRecoleccionId,
              nombre: 'Punto no disponible',
              zonaNombre: '—',
              direccion: 'No se encontró en el catálogo o fue eliminado.',
              estimacionParadaMinutos: l.estimacionParadaMinutos,
              lat: NaN,
              lng: NaN,
              datosIncompletos: true,
            };
          }
          return {
            orden: l.ordenSecuencia,
            puntoRecoleccionId: pr.id,
            nombre: pr.nombre,
            zonaNombre: pr.zonaNombre,
            direccion: pr.direccion,
            estimacionParadaMinutos: l.estimacionParadaMinutos,
            lat: pr.latitud,
            lng: pr.longitud,
            datosIncompletos: false,
          };
        });
        this.paradasVista.set(vistas);
      });
  }

  protected onClose(): void {
    this.closed.emit();
  }

  protected labelTipoRuta(val: string | null | undefined): string {
    const v = (val ?? '').trim();
    if (!v) {
      return 'Sin especificar';
    }
    return TIPO_RUTA_LABELS[v] ?? v;
  }

  protected textoDuracion(min: number | null | undefined): string {
    if (min === null || min === undefined) {
      return '—';
    }
    return `${min} min`;
  }

  protected formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  }
}

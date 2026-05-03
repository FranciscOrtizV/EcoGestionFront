import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { environment } from '../../../../environments/environment';

/** Punto geográfico para mostrar en el mapa (solo lectura). */
export type MapaPuntoMarcador = {
  lat: number;
  lng: number;
  /** Número mostrado en el pin (p. ej. orden de visita). Si se omite, se usa 1…n según la lista. */
  orden?: number;
  titulo?: string;
  subtitulo?: string;
};

const DEFAULT_CENTER: L.LatLngTuple = [
  environment.mapDefaultCenter.lat,
  environment.mapDefaultCenter.lng,
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createNumberedDivIcon(n: number): L.DivIcon {
  return L.divIcon({
    className: 'map-puntos-lista__marker-wrap',
    html: `<div class="map-puntos-lista__marker-pin" aria-hidden="true">${n}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

@Component({
  selector: 'app-map-puntos-lista',
  standalone: true,
  imports: [],
  templateUrl: './map-puntos-lista.component.html',
  styleUrl: './map-puntos-lista.component.css',
  host: {
    '[class.map-puntos-lista--fill]': 'fillHeight()',
  },
})
export class MapPuntosListaComponent implements AfterViewInit, OnDestroy {
  private readonly mapContainer = viewChild.required<ElementRef<HTMLElement>>('mapRef');

  /** Puntos en el orden deseado (p. ej. recorrido). */
  readonly puntos = input<readonly MapaPuntoMarcador[]>([]);

  /** Si hay al menos 2 puntos, dibuja la polilínea del recorrido. */
  readonly mostrarRecorrido = input(true);

  readonly minHeightPx = input<number>(280);

  /**
   * Si es true, el mapa usa `height: 100%` del contenedor padre (flex/grid).
   * Útil en modales o paneles donde debe estirarse verticalmente.
   */
  readonly fillHeight = input(false);

  readonly ariaLabel = input<string>('Mapa con puntos en el terreno');

  private map: L.Map | null = null;
  private capa: L.LayerGroup | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const pts = this.puntos();
      if (!this.map) {
        return;
      }
      this.actualizarPuntos(pts);
    });
  }

  ngAfterViewInit(): void {
    const el = this.mapContainer().nativeElement;
    this.map = L.map(el, {
      center: DEFAULT_CENTER,
      zoom: 13,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    this.actualizarPuntos(this.puntos());
    setTimeout(() => this.map!.invalidateSize(), 0);
    setTimeout(() => this.map!.invalidateSize(), 200);

    if (this.fillHeight()) {
      const el = this.mapContainer().nativeElement;
      this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
      this.resizeObserver.observe(el);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.limpiarCapa();
    this.map?.remove();
    this.map = null;
  }

  private limpiarCapa(): void {
    if (this.capa && this.map) {
      this.map.removeLayer(this.capa);
    }
    this.capa = null;
  }

  private actualizarPuntos(pts: readonly MapaPuntoMarcador[]): void {
    if (!this.map) {
      return;
    }

    this.limpiarCapa();

    const validos = pts.filter(
      (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng),
    );

    if (validos.length === 0) {
      this.map.setView(DEFAULT_CENTER, 13);
      return;
    }

    const group = L.layerGroup().addTo(this.map);
    this.capa = group;

    const latlngs: L.LatLngTuple[] = validos.map((p) => [p.lat, p.lng]);

    if (validos.length >= 2 && this.mostrarRecorrido()) {
      L.polyline(latlngs, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.88,
        lineJoin: 'round',
      }).addTo(group);
    }

    validos.forEach((p, i) => {
      const orden = p.orden ?? i + 1;
      const marker = L.marker([p.lat, p.lng], {
        icon: createNumberedDivIcon(orden),
      });

      const titulo = (p.titulo ?? `Parada ${orden}`).trim();
      const sub = (p.subtitulo ?? '').trim();
      const body =
        sub.length > 0
          ? `<strong>${escapeHtml(titulo)}</strong><br><span class="map-puntos-lista__popup-sub">${escapeHtml(sub)}</span>`
          : `<strong>${escapeHtml(titulo)}</strong>`;
      marker.bindPopup(body, { maxWidth: 280 }).addTo(group);
    });

    if (validos.length === 1) {
      this.map.setView(latlngs[0], 15);
    } else {
      const bounds = L.latLngBounds(latlngs);
      this.map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
    }

    setTimeout(() => this.map?.invalidateSize(), 0);
  }
}

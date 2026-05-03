import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { environment } from '../../../../environments/environment';

/** Payload emitido al padre: latitud y longitud (WGS84). */
export type MapPointSelectedEvent = { lat: number; lng: number };

const DEFAULT_CENTER: L.LatLngTuple = [
  environment.mapDefaultCenter.lat,
  environment.mapDefaultCenter.lng,
];

function createDefaultPinIcon(): L.Icon {
  return L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

@Component({
  selector: 'app-map-point-picker',
  standalone: true,
  imports: [],
  templateUrl: './map-point-picker.component.html',
  styleUrl: './map-point-picker.component.css',
})
export class MapPointPickerComponent implements AfterViewInit, OnDestroy {
  private readonly mapContainer = viewChild.required<ElementRef<HTMLElement>>('mapRef');

  /** Centro inicial [lat, lng]. Por defecto desde `environment.mapDefaultCenter`. */
  readonly center = input<L.LatLngTuple>(DEFAULT_CENTER);

  /** Zoom inicial (OpenStreetMap). */
  readonly zoom = input<number>(14);

  /** Altura mínima del mapa en píxeles. */
  readonly minHeightPx = input<number>(420);

  /** Texto accesible del mapa. */
  readonly ariaLabel = input<string>('Mapa para elegir un punto');

  /** Si `false`, no se registran clics (p. ej. modo solo lectura). */
  readonly interactive = input(true);

  /** Marca inicial (p. ej. al editar). Si falta uno de los dos, se ignora. */
  readonly initialLat = input<number | null>(null);
  readonly initialLng = input<number | null>(null);

  /** Emite la latitud y longitud del último clic. */
  readonly pointSelected = output<MapPointSelectedEvent>();

  private map: L.Map | null = null;
  private selectionMarker: L.Marker | null = null;
  private readonly pinIcon = createDefaultPinIcon();

  constructor() {
    effect(() => {
      const lat = this.initialLat();
      const lng = this.initialLng();
      if (!this.map || lat == null || lng == null) {
        return;
      }
      this.placeMarker(lat, lng, true);
      this.map.setView([lat, lng], this.zoom());
    });
  }

  ngAfterViewInit(): void {
    const el = this.mapContainer().nativeElement;
    const center = this.center();
    this.map = L.map(el, {
      center,
      zoom: this.zoom(),
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (!this.interactive()) {
        return;
      }
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      this.pointSelected.emit({ lat, lng });
      this.placeMarker(lat, lng, true);
    });

    const ilat = this.initialLat();
    const ilng = this.initialLng();
    if (ilat != null && ilng != null) {
      this.placeMarker(ilat, ilng, true);
      this.map.setView([ilat, ilng], this.zoom());
    }

    setTimeout(() => this.map!.invalidateSize(), 0);
  }

  ngOnDestroy(): void {
    if (this.selectionMarker && this.map) {
      this.map.removeLayer(this.selectionMarker);
      this.selectionMarker = null;
    }
    this.map?.remove();
    this.map = null;
  }

  private placeMarker(lat: number, lng: number, openPopup: boolean): void {
    if (!this.map) {
      return;
    }
    const latlng = L.latLng(lat, lng);
    if (this.selectionMarker) {
      this.map.removeLayer(this.selectionMarker);
    }
    this.selectionMarker = L.marker(latlng, { icon: this.pinIcon }).addTo(this.map).bindPopup(
      `<strong>Punto seleccionado</strong><br>${lat.toFixed(6)}<br>${lng.toFixed(6)}`,
    );
    if (openPopup) {
      this.selectionMarker.openPopup();
    }
  }
}

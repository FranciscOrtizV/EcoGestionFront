import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { toast } from 'ngx-sonner';
import { catchError, finalize, of } from 'rxjs';
import { AsignacionRutasService } from '../../../../core/services/asignacion-rutas.service';
import {
  MapPuntosListaComponent,
  type MapaPuntoMarcador,
} from '../../../../shared/components/map-puntos-lista/map-puntos-lista.component';
import type { AsignacionRutaDetalle } from '../../types';

@Component({
  selector: 'app-ver-asignacion-ruta-detalle-modal',
  standalone: true,
  imports: [MapPuntosListaComponent],
  templateUrl: './ver-asignacion-ruta-detalle-modal.component.html',
})
export class VerAsignacionRutaDetalleModalComponent implements OnInit {
  private readonly asignacionRutasService = inject(AsignacionRutasService);

  readonly asignacionId = input.required<string>();

  closed = output<void>();

  protected readonly loading = signal(true);
  protected readonly detalle = signal<AsignacionRutaDetalle | null>(null);
  protected readonly marcadoresMapa = computed<MapaPuntoMarcador[]>(() => {
    const d = this.detalle();

    if (!d) return [];

    return d.puntosRuta
      .map((p) => ({
        lat: Number(p.latitud),
        lng: Number(p.longitud),
        orden: p.orden_secuencia,
        titulo: p.nombre_punto_recoleccion,
        subtitulo: p.referencia?.trim()
          ? `${p.tipo_punto} · ${p.direccion} · Ref: ${p.referencia}`
          : `${p.tipo_punto} · ${p.direccion}`,
      }));
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.asignacionRutasService
      .getById(this.asignacionId())
      .pipe(
        catchError(() => {
          toast.error('No se pudo cargar el detalle de la asignación.');
          return of(null as AsignacionRutaDetalle | null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((d) => this.detalle.set(d));
  }

  protected textoEstimacionMinutos(min: number | null): string {
    if (min === null) {
      return '—';
    }
    return `${min} min`;
  }

  protected onClose(): void {
    this.closed.emit();
  }
}

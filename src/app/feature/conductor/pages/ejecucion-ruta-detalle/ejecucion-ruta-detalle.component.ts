import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

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

@Component({
  selector: 'app-ejecucion-ruta-detalle',
  standalone: true,
  imports: [RouterLink],
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

  protected volverAlListado(): void {
    void this.router.navigate(['/conductor', 'mis-rutas']);
  }
}

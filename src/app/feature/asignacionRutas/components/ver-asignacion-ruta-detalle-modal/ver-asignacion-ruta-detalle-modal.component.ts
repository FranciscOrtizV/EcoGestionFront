import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { toast } from 'ngx-sonner';
import { catchError, finalize, of } from 'rxjs';
import { AsignacionRutasService } from '../../../../core/services/asignacion-rutas.service';
import type { AsignacionRutaDetalle } from '../../types';

@Component({
  selector: 'app-ver-asignacion-ruta-detalle-modal',
  standalone: true,
  templateUrl: './ver-asignacion-ruta-detalle-modal.component.html',
})
export class VerAsignacionRutaDetalleModalComponent implements OnInit {
  private readonly asignacionRutasService = inject(AsignacionRutasService);

  readonly asignacionId = input.required<string>();

  closed = output<void>();

  protected readonly loading = signal(true);
  protected readonly detalle = signal<AsignacionRutaDetalle | null>(null);

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

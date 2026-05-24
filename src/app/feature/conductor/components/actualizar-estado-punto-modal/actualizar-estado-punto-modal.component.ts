import { NgClass } from '@angular/common';
import { Component, OnInit, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize } from 'rxjs';
import { EjecucionRutasService } from '../../../../core/services/ejecucion-rutas.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { EstadoEjecucionPuntoRutaEnum } from '../../../../shared/enums/EstadoEjecucionPuntoRuta.enum';

const ESTADO_PUNTO_OPCIONES: readonly {
  value: EstadoEjecucionPuntoRutaEnum;
  label: string;
}[] = [
  { value: EstadoEjecucionPuntoRutaEnum.COMPLETADO, label: 'Completado' },
  { value: EstadoEjecucionPuntoRutaEnum.SALTADO, label: 'Saltado' },
  { value: EstadoEjecucionPuntoRutaEnum.FALLIDO, label: 'Fallido' },
];

@Component({
  selector: 'app-actualizar-estado-punto-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './actualizar-estado-punto-modal.component.html',
})
export class ActualizarEstadoPuntoModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ejecucionRutasService = inject(EjecucionRutasService);
  private readonly loadingService = inject(LoadingService);

  readonly ejecucionRutaId = input.required<string>();
  readonly puntoId = input.required<string>();
  readonly puntoNombre = input.required<string>();
  readonly estadoInicial = input<EstadoEjecucionPuntoRutaEnum>(
    EstadoEjecucionPuntoRutaEnum.PENDIENTE,
  );
  readonly comentariosIniciales = input<string | null>(null);
  /** Si se define, reemplaza `estadoInicial` al abrir el formulario (p. ej. COMPLETADO). */
  readonly estadoPredeterminado = input<EstadoEjecucionPuntoRutaEnum | null>(null);

  cancelled = output<void>();
  actualizado = output<void>();

  protected readonly opcionesEstado = ESTADO_PUNTO_OPCIONES;

  readonly form = this.fb.nonNullable.group({
    estado: [EstadoEjecucionPuntoRutaEnum.COMPLETADO, Validators.required],
    comentarios: [''],
  });

  ngOnInit(): void {
    let estado = this.estadoPredeterminado() ?? this.estadoInicial();
    if (estado === EstadoEjecucionPuntoRutaEnum.PENDIENTE) {
      estado = EstadoEjecucionPuntoRutaEnum.COMPLETADO;
    }
    this.form.patchValue({
      estado,
      comentarios: this.comentariosIniciales() ?? '',
    });
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      toast.warning('Selecciona un estado para el punto.');
      return;
    }

    const raw = this.form.getRawValue();
    const comentarios = raw.comentarios.trim();

    this.loadingService.setLoading(true);
    this.ejecucionRutasService
      .actualizarEstadoPunto(this.ejecucionRutaId(), this.puntoId(), {
        estado: raw.estado,
        comentarios: comentarios === '' ? null : comentarios,
      })
      .pipe(
        catchError(() => {
          toast.error('No se pudo actualizar el estado del punto. Inténtalo de nuevo.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success('Estado del punto actualizado.');
        this.actualizado.emit();
      });
  }

  protected fieldInvalid(name: 'estado'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }
}

import { NgClass } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize } from 'rxjs';
import { IncidenciasService } from '../../../../core/services/incidencias.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { EstadoResolucionIncidenciaEnum } from '../../../../shared/enums/EstadoResolucionIncidencia.enum';
import { labelEstadoIncidencia } from '../../utils/incidencia-display.utils';

const COMENTARIO_MIN = 5;
const COMENTARIO_MAX = 500;

const ESTADO_RESOLUCION_OPCIONES: readonly {
  value: EstadoResolucionIncidenciaEnum;
  label: string;
}[] = [
  { value: EstadoResolucionIncidenciaEnum.RESUELTA, label: 'Resuelta' },
  { value: EstadoResolucionIncidenciaEnum.CERRADA, label: 'Cerrada' },
];

@Component({
  selector: 'app-resolver-incidencia-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './resolver-incidencia-modal.component.html',
})
export class ResolverIncidenciaModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly loadingService = inject(LoadingService);

  readonly incidenciaId = input.required<string>();
  readonly incidenciaTitulo = input.required<string>();

  cancelled = output<void>();
  resolved = output<void>();

  protected readonly opcionesEstado = ESTADO_RESOLUCION_OPCIONES;
  protected readonly comentarioMax = COMENTARIO_MAX;

  protected readonly form = this.fb.nonNullable.group({
    estado: [EstadoResolucionIncidenciaEnum.RESUELTA, Validators.required],
    comentarioResolucion: [
      '',
      [Validators.required, Validators.minLength(COMENTARIO_MIN), Validators.maxLength(COMENTARIO_MAX)],
    ],
  });

  protected readonly comentarioLength = () =>
    this.form.controls.comentarioResolucion.value.trim().length;

  protected fieldInvalid(name: 'estado' | 'comentarioResolucion'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  protected comentarioErrorMessage(): string | null {
    const c = this.form.controls.comentarioResolucion;
    if (!c.invalid || !(c.dirty || c.touched)) return null;
    if (c.errors?.['required'] || c.errors?.['minlength']) {
      return `El comentario es obligatorio (mínimo ${COMENTARIO_MIN} caracteres).`;
    }
    if (c.errors?.['maxlength']) {
      return `El comentario no puede superar ${COMENTARIO_MAX} caracteres.`;
    }
    return null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.loadingService.setLoading(true);
    this.incidenciasService
      .resolverIncidencia(this.incidenciaId(), {
        estado: raw.estado,
        comentarioResolucion: raw.comentarioResolucion.trim(),
      })
      .pipe(
        catchError(() => {
          toast.error('No se pudo resolver la incidencia. Inténtalo de nuevo.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success(
          `Incidencia marcada como ${labelEstadoIncidencia(raw.estado).toLowerCase()} correctamente.`,
        );
        this.resolved.emit();
      });
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }
}

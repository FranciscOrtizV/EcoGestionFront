import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize, of } from 'rxjs';
import { TiposIncidenciasListApiDto } from '../../../../core/interfaces/response';
import { LoadingService } from '../../../../core/services/loading.service';
import { TiposIncidenciasService } from '../../../../core/services/tiposIncidencias.service';
import type { CreateTipoIncidenciaRequest, TipoIncidenciaFormModalContext, UpdateTipoIncidenciaRequest } from '../../types';
import { formatNombreParaTabla } from '../../utils/formatNombreDisplay';

@Component({
  selector: 'app-create-tipo-incidencia-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './create-tipo-incidencia-modal.component.html',
})
export class CreateTipoIncidenciaModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tiposService = inject(TiposIncidenciasService);
  private readonly loadingService = inject(LoadingService);

  readonly context = input.required<TipoIncidenciaFormModalContext>();

  cancelled = output<void>();
  saved = output<void>();

  private descripcionInicial = '';
  private detalleCargado = false;

  readonly isEdit = computed(() => this.context().mode === 'edit');
  readonly isView = computed(() => this.context().mode === 'view');

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: ['', [Validators.maxLength(5000)]],
  });

  ngOnInit(): void {
    const ctx = this.context();
    if (ctx.mode === 'create') {
      return;
    }

    this.tiposService
      .getTipoIncidenciaById(ctx.tipoIncidenciaId)
      .pipe(
        catchError(() => {
          toast.error('No se pudo cargar el tipo de incidencia.');
          return of(null as TiposIncidenciasListApiDto | null);
        }),
      )
      .subscribe((dto) => {
        if (!dto) return;

        const desc = dto.descripcion ?? '';
        this.form.patchValue({
          nombre: formatNombreParaTabla(dto.nombre),
          descripcion: desc,
        });

        this.descripcionInicial = desc.trim();

        if (ctx.mode === 'view') {
          this.form.disable({ emitEvent: false });
          this.detalleCargado = true;
          return;
        }

        this.form.controls.nombre.disable({ emitEvent: false });
        this.detalleCargado = true;
      });
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  protected submit(): void {
    if (this.context().mode === 'view') {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      toast.warning('Revisa los campos del formulario.');
      return;
    }

    const ctx = this.context();
    const raw = this.form.getRawValue();

    if (ctx.mode === 'create') {
      const body: CreateTipoIncidenciaRequest = {
        nombre: raw.nombre.trim(),
      };
      const d = raw.descripcion.trim();
      if (d) {
        body.descripcion = d;
      }

      this.loadingService.setLoading(true);
      this.tiposService
        .createTipoIncidencia(body)
        .pipe(
          catchError(() => {
            toast.error('No se pudo crear el tipo de incidencia.');
            return EMPTY;
          }),
          finalize(() => this.loadingService.setLoading(false)),
        )
        .subscribe(() => {
          toast.success('Tipo de incidencia creado correctamente.');
          this.saved.emit();
        });
      return;
    }

    if (ctx.mode !== 'edit') {
      return;
    }

    if (!this.detalleCargado) {
      toast.warning('Espera a que terminen de cargar los datos.');
      return;
    }

    const nueva = raw.descripcion.trim();
    if (nueva === this.descripcionInicial) {
      toast.info('No hay cambios por guardar.');
      return;
    }

    const patch: UpdateTipoIncidenciaRequest = {
      descripcion: nueva === '' ? null : nueva,
    };

    this.loadingService.setLoading(true);
    this.tiposService
      .updateTipoIncidencia(ctx.tipoIncidenciaId, patch)
      .pipe(
        catchError(() => {
          toast.error('No se pudo actualizar el tipo de incidencia.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success('Tipo de incidencia actualizado correctamente.');
        this.saved.emit();
      });
  }

  protected fieldInvalid(name: 'nombre' | 'descripcion'): boolean {
    if (this.isView()) return false;
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }
}

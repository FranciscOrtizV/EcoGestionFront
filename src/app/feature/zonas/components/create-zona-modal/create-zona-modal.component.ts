import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize, of } from 'rxjs';
import { LoadingService } from '../../../../core/services/loading.service';
import { ZonasService } from '../../../../core/services/zonas.service';
import type { CreateZonaRequest, UpdateZonaRequest, ZonaFormModalContext } from '../../types';

@Component({
  selector: 'app-create-zona-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './create-zona-modal.component.html',
})
export class CreateZonaModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly zonasService = inject(ZonasService);
  private readonly loadingService = inject(LoadingService);

  readonly context = input.required<ZonaFormModalContext>();

  cancelled = output<void>();
  saved = output<void>();

  private detalleCargado = false;
  private inicialNombre = '';
  private inicialCodigo = '';
  private inicialDescripcion = '';

  readonly isView = computed(() => this.context().mode === 'view');
  readonly isEdit = computed(() => this.context().mode === 'edit');

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    codigo: ['', [Validators.maxLength(50)]],
    descripcion: ['', [Validators.maxLength(5000)]],
  });

  ngOnInit(): void {
    const ctx = this.context();
    if (ctx.mode === 'create') {
      this.detalleCargado = true;
      return;
    }

    this.zonasService
      .getZonaById(ctx.zonaId)
      .pipe(
        catchError(() => {
          toast.error('No se pudo cargar la zona.');
          return of(null);
        }),
      )
      .subscribe((z) => {
        if (!z) return;

        const nom = z.nombre.trim();
        const cod = (z.codigo ?? '').trim();
        const desc = (z.descripcion ?? '').trim();

        this.inicialNombre = nom;
        this.inicialCodigo = cod;
        this.inicialDescripcion = desc;

        this.form.patchValue({
          nombre: z.nombre,
          codigo: cod,
          descripcion: desc,
        });

        if (ctx.mode === 'view') {
          this.form.disable({ emitEvent: false });
        }

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

    if (ctx.mode === 'create') {
      const raw = this.form.getRawValue();
      const body: CreateZonaRequest = { nombre: raw.nombre.trim() };
      const codigo = raw.codigo.trim();
      if (codigo) {
        body.codigo = codigo;
      }
      const desc = raw.descripcion.trim();
      if (desc) {
        body.descripcion = desc;
      }

      this.loadingService.setLoading(true);
      this.zonasService
        .createZona(body)
        .pipe(
          catchError(() => {
            toast.error('No se pudo crear la zona.');
            return EMPTY;
          }),
          finalize(() => this.loadingService.setLoading(false)),
        )
        .subscribe(() => {
          toast.success('Zona creada correctamente.');
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

    const raw = this.form.getRawValue();
    const nom = raw.nombre.trim();
    const cod = raw.codigo.trim();
    const desc = raw.descripcion.trim();

    const patch: UpdateZonaRequest = {};
    if (nom !== this.inicialNombre) {
      patch.nombre = nom;
    }
    if (cod !== this.inicialCodigo) {
      patch.codigo = cod;
    }
    if (desc !== this.inicialDescripcion) {
      patch.descripcion = desc;
    }

    if (Object.keys(patch).length === 0) {
      toast.info('No hay cambios por guardar.');
      return;
    }

    this.loadingService.setLoading(true);
    this.zonasService
      .updateZona(ctx.zonaId, patch)
      .pipe(
        catchError(() => {
          toast.error('No se pudo actualizar la zona.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success('Zona actualizada correctamente.');
        this.saved.emit();
      });
  }

  protected fieldInvalid(name: 'nombre' | 'codigo' | 'descripcion'): boolean {
    if (this.isView()) {
      return false;
    }
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }
}

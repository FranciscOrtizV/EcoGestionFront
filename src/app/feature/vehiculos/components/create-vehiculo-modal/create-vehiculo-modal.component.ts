import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize, of } from 'rxjs';
import { VehiculoListApiDto } from '../../../../core/interfaces/response/VehiculoListApiDto';
import { LoadingService } from '../../../../core/services/loading.service';
import { VehiculosService } from '../../../../core/services/vehiculos.service';
import { optionalAnioVehiculoValidator, optionalMinNumber } from '../../../../core/validators/vehiculo.dto.validators';
import { EstadoVehiculoEnum } from '../../../../shared/enums';
import type { CreateVehiculoRequest, UpdateVehiculoRequest, VehiculoFormModalContext } from '../../types';

type EditVehiculoSnapshot = {
  patente: string;
  codigoInterno: string;
  marca: string;
  modelo: string;
  anio: number | null;
  capacidadKg: number | null;
  capacidadM3: number | null;
  estado: EstadoVehiculoEnum;
};

@Component({
  selector: 'app-create-vehiculo-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './create-vehiculo-modal.component.html',
})
export class CreateVehiculoModalComponent implements OnInit {
  readonly maxAnioVehiculo = new Date().getFullYear() + 1;

  private readonly fb = inject(FormBuilder);
  private readonly vehiculosService = inject(VehiculosService);
  private readonly loadingService = inject(LoadingService);

  readonly context = input.required<VehiculoFormModalContext>();

  private editInitial: EditVehiculoSnapshot | null = null;

  cancelled = output<void>();
  saved = output<void>();

  readonly isEdit = computed(() => this.context().mode === 'edit');
  readonly isView = computed(() => this.context().mode === 'view');

  readonly estadoOptions = [
    { value: EstadoVehiculoEnum.DISPONIBLE, label: 'Disponible' },
    { value: EstadoVehiculoEnum.EN_MANTENCION, label: 'En mantención' },
    { value: EstadoVehiculoEnum.FUERA_DE_SERVICIO, label: 'Fuera de servicio' },
  ] as const;

  readonly form = this.fb.nonNullable.group({
    patente: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(20)]],
    codigoInterno: ['', [Validators.maxLength(50)]],
    marca: ['', [Validators.maxLength(100)]],
    modelo: ['', [Validators.maxLength(100)]],
    anioVehiculo: ['', [optionalAnioVehiculoValidator()]],
    capacidadKg: ['', [optionalMinNumber(0)]],
    capacidadM3: ['', [optionalMinNumber(0)]],
    estado: [EstadoVehiculoEnum.DISPONIBLE, Validators.required],
  });

  ngOnInit(): void {
    const ctx = this.context();
    if (ctx.mode === 'create') {
      return;
    }

    this.vehiculosService
      .getVehiculoById(ctx.vehiculoId)
      .pipe(
        catchError(() => {
          toast.error('No se pudo cargar el vehículo.');
          return of(null as VehiculoListApiDto | null);
        }),
      )
      .subscribe((dto) => {
        if (!dto) return;
        const anio = parseAnioDto(dto.anioVehiculo);
        const kg = parseCapacidadDto(dto.capacidadKg);
        const m3 = parseCapacidadDto(dto.capacidadM3);
        const est = dto.estado as EstadoVehiculoEnum;

        this.form.patchValue({
          patente: dto.patente,
          codigoInterno: dto.codigoInterno ?? '',
          marca: dto.marca ?? '',
          modelo: dto.modelo ?? '',
          anioVehiculo: anio != null ? String(anio) : '',
          capacidadKg: kg != null ? String(kg) : '',
          capacidadM3: m3 != null ? String(m3) : '',
          estado: est,
        });

        if (ctx.mode === 'view') {
          this.form.disable({ emitEvent: false });
          return;
        }

        this.editInitial = {
          patente: dto.patente,
          codigoInterno: (dto.codigoInterno ?? '').trim(),
          marca: (dto.marca ?? '').trim(),
          modelo: (dto.modelo ?? '').trim(),
          anio,
          capacidadKg: kg,
          capacidadM3: m3,
          estado: est,
        };
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
    const v = this.form.getRawValue();

    if (ctx.mode === 'create') {
      const body: CreateVehiculoRequest = {
        patente: v.patente.trim(),
        estado: v.estado,
      };

      const ci = v.codigoInterno.trim();
      if (ci) body.codigoInterno = ci;
      const m = v.marca.trim();
      if (m) body.marca = m;
      const mo = v.modelo.trim();
      if (mo) body.modelo = mo;

      const anioRaw = v.anioVehiculo;
      if (anioRaw !== '' && anioRaw != null) {
        body.anioVehiculo =
          typeof anioRaw === 'number' ? anioRaw : parseInt(String(anioRaw).trim(), 10);
      }

      const kgRaw = v.capacidadKg;
      if (kgRaw !== '' && kgRaw != null) {
        body.capacidadKg = typeof kgRaw === 'number' ? kgRaw : parseFloat(String(kgRaw));
      }

      const m3Raw = v.capacidadM3;
      if (m3Raw !== '' && m3Raw != null) {
        body.capacidadM3 = typeof m3Raw === 'number' ? m3Raw : parseFloat(String(m3Raw));
      }

      this.loadingService.setLoading(true);
      this.vehiculosService
        .createVehiculo(body)
        .pipe(
          catchError(() => {
            toast.error('No se pudo crear el vehículo.');
            return EMPTY;
          }),
          finalize(() => this.loadingService.setLoading(false)),
        )
        .subscribe(() => {
          toast.success('Vehículo creado correctamente.');
          this.saved.emit();
        });
      return;
    }

    if (ctx.mode !== 'edit') {
      return;
    }

    if (!this.editInitial) {
      toast.warning('Espera a que termine de cargar el vehículo.');
      return;
    }

    const patch = this.buildPartialUpdate(v, this.editInitial);
    if (Object.keys(patch).length === 0) {
      toast.info('No hay cambios por guardar.');
      return;
    }

    this.loadingService.setLoading(true);
    this.vehiculosService
      .updateVehiculo(ctx.vehiculoId, patch)
      .pipe(
        catchError(() => {
          toast.error('No se pudo actualizar el vehículo.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success('Vehículo actualizado correctamente.');
        this.saved.emit();
      });
  }

  private buildPartialUpdate(
    v: {
      patente: string;
      codigoInterno: string;
      marca: string;
      modelo: string;
      anioVehiculo: string | number;
      capacidadKg: string | number;
      capacidadM3: string | number;
      estado: EstadoVehiculoEnum;
    },
    initial: EditVehiculoSnapshot,
  ): UpdateVehiculoRequest {
    const patch: UpdateVehiculoRequest = {};

    const pat = v.patente.trim();
    if (pat !== initial.patente.trim()) {
      patch.patente = pat;
    }

    const ci = v.codigoInterno.trim();
    if (ci !== initial.codigoInterno) {
      patch.codigoInterno = ci === '' ? null : ci;
    }

    const mar = v.marca.trim();
    if (mar !== initial.marca) {
      patch.marca = mar === '' ? null : mar;
    }

    const mod = v.modelo.trim();
    if (mod !== initial.modelo) {
      patch.modelo = mod === '' ? null : mod;
    }

    const anio = parseAnioForm(v.anioVehiculo);
    if (anio !== initial.anio) {
      patch.anioVehiculo = anio;
    }

    const kg = parseCapacidadForm(v.capacidadKg);
    if (kg !== initial.capacidadKg) {
      patch.capacidadKg = kg;
    }

    const m3 = parseCapacidadForm(v.capacidadM3);
    if (m3 !== initial.capacidadM3) {
      patch.capacidadM3 = m3;
    }

    if (v.estado !== initial.estado) {
      patch.estado = v.estado;
    }

    return patch;
  }

  protected fieldInvalid(
    name:
      | 'patente'
      | 'codigoInterno'
      | 'marca'
      | 'modelo'
      | 'anioVehiculo'
      | 'capacidadKg'
      | 'capacidadM3'
      | 'estado',
  ): boolean {
    if (this.isView()) return false;
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  protected anioErrorMessage(): string | null {
    if (this.isView()) return null;
    const c = this.form.controls.anioVehiculo;
    if (!c.touched || !c.errors) return null;
    if (c.hasError('number')) return 'Indica un año válido.';
    if (c.hasError('integer')) return 'El año debe ser un número entero.';
    if (c.hasError('yearRange')) {
      const e = c.getError('yearRange');
      return `El año debe estar entre ${e?.min ?? 1900} y ${e?.max ?? new Date().getFullYear() + 1}.`;
    }
    return null;
  }

  protected numberOrMinError(key: 'capacidadKg' | 'capacidadM3', label: string): string | null {
    if (this.isView()) return null;
    const c = this.form.controls[key];
    if (!c.touched || !c.errors) return null;
    if (c.hasError('number')) return 'Indica un número válido.';
    if (c.hasError('min')) return `${label} no puede ser negativo.`;
    return null;
  }
}

function parseAnioDto(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (Number.isNaN(n) || !Number.isInteger(n)) return null;
  return n;
}

function parseCapacidadDto(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function parseAnioForm(raw: string | number): number | null {
  if (raw === '' || raw === null || raw === undefined) return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function parseCapacidadForm(raw: string | number): number | null {
  if (raw === '' || raw === null || raw === undefined) return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

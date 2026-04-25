import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize, forkJoin, of } from 'rxjs';
import { AsignacionRutasService } from '../../../../core/services/asignacion-rutas.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { RutasService } from '../../../../core/services/rutas.service';
import { UsersService } from '../../../../core/services/users.service';
import { VehiculosService } from '../../../../core/services/vehiculos.service';
import type { UserRow } from '../../../users/types';
import type { VehiculoRow } from '../../../vehiculos/types';
import type { RutaRow } from '../../../rutas/types';
import type {
  AsignacionRutaEditData,
  CreateAsignacionRutaRequest,
  TurnoEnum,
  UpdateAsignacionRutaRequest,
} from '../../types';

@Component({
  selector: 'app-create-asignacion-ruta-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './create-asignacion-ruta-modal.component.html',
})
export class CreateAsignacionRutaModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly asignacionRutasService = inject(AsignacionRutasService);
  private readonly authService = inject(AuthService);
  private readonly rutasService = inject(RutasService);
  private readonly vehiculosService = inject(VehiculosService);
  private readonly usersService = inject(UsersService);
  private readonly loadingService = inject(LoadingService);

  readonly asignacionId = input<string | null>(null);

  cancelled = output<void>();
  saved = output<void>();

  protected readonly isEditMode = computed(
    () => this.asignacionId() !== null && this.asignacionId() !== '',
  );

  protected readonly rutasActivas = signal<RutaRow[]>([]);
  protected readonly vehiculosActivos = signal<VehiculoRow[]>([]);
  protected readonly conductores = signal<UserRow[]>([]);
  protected readonly supervisores = signal<UserRow[]>([]);
  protected readonly turnoOptions: readonly TurnoEnum[] = ['MANANA', 'TARDE', 'NOCHE'];

  readonly form = this.fb.nonNullable.group({
    rutaId: ['', Validators.required],
    vehiculoId: ['', Validators.required],
    conductorId: ['', Validators.required],
    supervisorId: [''],
    turno: ['' as TurnoEnum | '', Validators.required],
    planificacionTiempoInicio: [''],
    planificacionTiempoFin: [''],
    notas: ['', [Validators.maxLength(20000)]],
  });

  ngOnInit(): void {
    this.cargarCatalogos();
    const id = this.asignacionId();
    if (id) {
      this.cargarEdicion(id);
    }
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      toast.warning('Revisa los campos requeridos del formulario.');
      return;
    }

    const v = this.form.getRawValue();
    const currentUser = this.authService.currentUser();
    if (!currentUser?.id) {
      toast.error('No se pudo identificar al planificador actual.');
      return;
    }
    if (
      v.planificacionTiempoInicio &&
      v.planificacionTiempoFin &&
      v.planificacionTiempoInicio > v.planificacionTiempoFin
    ) {
      toast.error('La planificación de inicio no puede ser mayor a la de fin.');
      return;
    }

    const editId = this.asignacionId();
    if (editId) {
      const patch: UpdateAsignacionRutaRequest = {
        rutaId: v.rutaId,
        vehiculoId: v.vehiculoId,
        conductorId: v.conductorId,
        turno: v.turno as TurnoEnum,
      };
      patch.supervisorId = v.supervisorId.trim() ? v.supervisorId.trim() : null;
      if (v.planificacionTiempoInicio) {
        patch.planificacionTiempoInicio = new Date(v.planificacionTiempoInicio);
      }
      if (v.planificacionTiempoFin) {
        patch.planificacionTiempoFin = new Date(v.planificacionTiempoFin);
      }
      patch.notas = v.notas.trim();

      this.loadingService.setLoading(true);
      this.asignacionRutasService
        .update(editId, patch)
        .pipe(
          catchError(() => {
            toast.error('No se pudo actualizar la asignación de ruta.');
            return EMPTY;
          }),
          finalize(() => this.loadingService.setLoading(false)),
        )
        .subscribe(() => {
          toast.success('Asignación de ruta actualizada correctamente.');
          this.saved.emit();
        });
      return;
    }

    const body: CreateAsignacionRutaRequest = {
      rutaId: v.rutaId,
      vehiculoId: v.vehiculoId,
      conductorId: v.conductorId,
      planificadorId: currentUser.id,
      fechaAsignacion: this.hoyIsoDate(),
      turno: v.turno as TurnoEnum,
    };

    if (v.supervisorId.trim()) {
      body.supervisorId = v.supervisorId.trim();
    }
    if (v.planificacionTiempoInicio) {
      body.planificacionTiempoInicio = new Date(v.planificacionTiempoInicio);
    }
    if (v.planificacionTiempoFin) {
      body.planificacionTiempoFin = new Date(v.planificacionTiempoFin);
    }
    if (v.notas.trim()) {
      body.notas = v.notas.trim();
    }

    this.loadingService.setLoading(true);
    this.asignacionRutasService
      .create(body)
      .pipe(
        catchError(() => {
          toast.error('No se pudo crear la asignación de ruta.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success('Asignación de ruta creada correctamente.');
        this.saved.emit();
      });
  }

  protected fieldInvalid(
    name:
      | 'rutaId'
      | 'vehiculoId'
      | 'conductorId'
      | 'supervisorId'
      | 'turno'
      | 'planificacionTiempoInicio'
      | 'planificacionTiempoFin'
      | 'notas',
  ): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  private cargarEdicion(id: string): void {
    this.loadingService.setLoading(true);
    this.asignacionRutasService
      .getByIdForEdit(id)
      .pipe(
        catchError(() => {
          toast.error('No se pudo cargar la asignación a editar.');
          return of(null as AsignacionRutaEditData | null);
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe((d) => {
        if (!d) {
          return;
        }
        this.form.patchValue({
          rutaId: d.rutaId,
          vehiculoId: d.vehiculoId,
          conductorId: d.conductorId,
          supervisorId: d.supervisorId ?? '',
          turno: d.turno,
          planificacionTiempoInicio: d.planificacionTiempoInicio,
          planificacionTiempoFin: d.planificacionTiempoFin,
          notas: d.notas,
        });
      });
  }

  private cargarCatalogos(): void {
    this.loadingService.setLoading(true);
    forkJoin({
      rutas: this.rutasService.findAll(false).pipe(
        catchError(() => {
          toast.error('No se pudieron cargar las rutas.');
          return of([] as RutaRow[]);
        }),
      ),
      vehiculos: this.vehiculosService.getVehiculos().pipe(
        catchError(() => {
          toast.error('No se pudieron cargar los vehículos.');
          return of([] as VehiculoRow[]);
        }),
      ),
      users: this.usersService.getUsers().pipe(
        catchError(() => {
          toast.error('No se pudieron cargar los usuarios.');
          return of([] as UserRow[]);
        }),
      ),
    })
      .pipe(finalize(() => this.loadingService.setLoading(false)))
      .subscribe(({ rutas, vehiculos, users }) => {
        this.rutasActivas.set(rutas.filter((r) => r.isActive));
        this.vehiculosActivos.set(vehiculos.filter((v) => v.isActive));

        const activos = users.filter((u) => u.active);
        this.conductores.set(activos.filter((u) => u.role.includes('CONDUCTOR')));
        this.supervisores.set(activos.filter((u) => u.role.includes('SUPERVISOR')));
      });
  }

  private hoyIsoDate(): string {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

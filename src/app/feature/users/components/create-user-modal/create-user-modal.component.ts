import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize, of } from 'rxjs';
import { RoleDto } from '../../../../core/interfaces/response';
import { LoadingService } from '../../../../core/services/loading.service';
import { UsersService } from '../../../../core/services/users.service';
import {
  nestCreateUsuarioPasswordValidator,
  optionalMinLength,
  optionalUpdateUsuarioPasswordValidator,
  uuidValidator,
} from '../../../../core/validators/create-usuario.dto.validators';
import type { UpdateUserRequest, UserFormModalContext } from '../../types';

type EditFormSnapshot = {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  phone: string;
  rolId: string;
};

@Component({
  selector: 'app-create-user-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './create-user-modal.component.html',
})
export class CreateUserModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly loadingService = inject(LoadingService);

  /** Valores cargados del servidor en edición; sirve para armar el PATCH parcial. */
  private editInitial: EditFormSnapshot | null = null;

  readonly context = input.required<UserFormModalContext>();

  cancelled = output<void>();
  saved = output<void>();

  readonly isEdit = computed(() => this.context().mode === 'edit');
  readonly isView = computed(() => this.context().mode === 'view');

  readonly roleOptions = signal<RoleDto[]>([]);
  readonly rolesLoaded = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(1)]],
    apellidoPaterno: ['', [Validators.required, Validators.minLength(1)]],
    apellidoMaterno: ['', [Validators.required, Validators.minLength(1)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [optionalMinLength(8)]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(50),
        nestCreateUsuarioPasswordValidator(),
      ],
    ],
    rolId: ['', [Validators.required, uuidValidator()]],
  });

  ngOnInit(): void {
    const mode = this.context().mode;
    if (mode === 'edit') {
      const pwd = this.form.controls.password;
      pwd.clearValidators();
      pwd.setValidators([optionalUpdateUsuarioPasswordValidator()]);
      pwd.updateValueAndValidity({ emitEvent: false });
    }
    if (mode === 'view') {
      const pwd = this.form.controls.password;
      pwd.clearValidators();
      pwd.updateValueAndValidity({ emitEvent: false });
    }

    this.usersService
      .getRoles()
      .pipe(
        catchError(() => {
          toast.error('No se pudieron cargar los roles.');
          return of([] as RoleDto[]);
        }),
      )
      .subscribe((roles) => {
        this.roleOptions.set(roles);
        this.rolesLoaded.set(true);

        const ctx = this.context();
        if (ctx.mode === 'create') {
          if (roles.length && !this.form.controls.rolId.value) {
            this.form.patchValue({ rolId: roles[0].id });
          }
          return;
        }

        this.usersService
          .getUserById(ctx.userId)
          .pipe(
            catchError(() => {
              toast.error('No se pudo cargar el usuario.');
              return of(null);
            }),
          )
          .subscribe((user) => {
            if (!user) return;
            const ctx = this.context();
            const rolId = user.roles?.[0]?.id ?? '';
            const rolOk = rolId && roles.some((r) => r.id === rolId);
            const resolvedRolId = rolOk ? rolId : (roles[0]?.id ?? '');
            this.form.patchValue({
              nombre: user.nombre,
              apellidoPaterno: user.apellidoPaterno,
              apellidoMaterno: user.apellidoMaterno,
              email: user.email,
              phone: user.phone ?? '',
              password: '',
              rolId: resolvedRolId,
            });
            if (ctx.mode === 'view') {
              this.form.disable({ emitEvent: false });
              return;
            }
            if (ctx.mode === 'edit') {
              this.editInitial = {
                nombre: user.nombre,
                apellidoPaterno: user.apellidoPaterno,
                apellidoMaterno: user.apellidoMaterno,
                email: user.email,
                phone: user.phone ?? '',
                rolId: resolvedRolId,
              };
            }
          });
      });
  }

  private buildPartialUpdate(v: {
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    email: string;
    phone: string;
    password: string;
    rolId: string;
  }): UpdateUserRequest {
    const initial = this.editInitial;
    if (!initial) return {};

    const patch: UpdateUserRequest = {};
    const n = v.nombre.trim();
    const ap = v.apellidoPaterno.trim();
    const am = v.apellidoMaterno.trim();
    const em = v.email.trim();
    const ph = v.phone.trim();
    const rol = v.rolId;

    if (n !== initial.nombre.trim()) patch.nombre = n;
    if (ap !== initial.apellidoPaterno.trim()) patch.apellidoPaterno = ap;
    if (am !== initial.apellidoMaterno.trim()) patch.apellidoMaterno = am;
    if (em !== initial.email.trim()) patch.email = em;

    const initialPhone = initial.phone.trim();
    if (ph !== initialPhone) {
      patch.phone = ph === '' ? null : ph;
    }

    if (rol !== initial.rolId) {
      patch.rolesIds = [rol];
    }

    const pwd = v.password.trim();
    if (pwd) {
      patch.password = pwd;
    }

    return patch;
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

    const v = this.form.getRawValue();
    const ctx = this.context();

    if (ctx.mode === 'create') {
      const phone = v.phone.trim();
      this.loadingService.setLoading(true);
      this.usersService
        .createUser({
          nombre: v.nombre.trim(),
          apellidoPaterno: v.apellidoPaterno.trim(),
          apellidoMaterno: v.apellidoMaterno.trim(),
          email: v.email.trim(),
          phone: phone || undefined,
          password: v.password,
          rolesIds: [v.rolId],
        })
        .pipe(
          catchError(() => {
            toast.error('No se pudo crear el usuario.');
            return EMPTY;
          }),
          finalize(() => this.loadingService.setLoading(false)),
        )
        .subscribe(() => {
          toast.success('Usuario creado correctamente.');
          this.saved.emit();
        });
      return;
    }

    if (ctx.mode !== 'edit') {
      return;
    }

    if (!this.editInitial) {
      toast.warning('Espera a que termine de cargar el usuario.');
      return;
    }

    const body = this.buildPartialUpdate(v);
    if (Object.keys(body).length === 0) {
      toast.info('No hay cambios por guardar.');
      return;
    }

    this.loadingService.setLoading(true);
    this.usersService
      .updateUser(ctx.userId, body)
      .pipe(
        catchError(() => {
          toast.error('No se pudo actualizar el usuario.');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success('Usuario actualizado correctamente.');
        this.saved.emit();
      });
  }

  protected fieldInvalid(
    name: 'nombre' | 'apellidoPaterno' | 'apellidoMaterno' | 'email' | 'phone' | 'password' | 'rolId',
  ): boolean {
    if (this.isView()) return false;
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  protected passwordErrorMessage(): string | null {
    const c = this.form.controls.password;
    if (!c.touched || !c.errors) return null;
    if (c.hasError('required')) return 'La contraseña es obligatoria.';
    if (c.hasError('minlength')) {
      const req = c.getError('minlength')?.requiredLength ?? 6;
      return `Mínimo ${req} caracteres.`;
    }
    if (c.hasError('maxlength')) {
      const req = c.getError('maxlength')?.requiredLength ?? 50;
      return `Máximo ${req} caracteres.`;
    }
    if (c.hasError('nestPassword')) {
      return 'Debe incluir mayúsculas, minúsculas y un número o carácter especial.';
    }
    return null;
  }

  protected phoneErrorMessage(): string | null {
    const c = this.form.controls.phone;
    if (!c.touched || !c.errors) return null;
    if (c.hasError('minlength')) {
      const req = c.getError('minlength')?.requiredLength ?? 8;
      return `Si indicas teléfono, debe tener al menos ${req} caracteres.`;
    }
    return null;
  }

  protected rolErrorMessage(): string | null {
    const c = this.form.controls.rolId;
    if (!c.touched || !c.errors) return null;
    if (c.hasError('required')) return 'Selecciona un rol.';
    if (c.hasError('uuid')) return 'El rol no es válido.';
    return null;
  }
}

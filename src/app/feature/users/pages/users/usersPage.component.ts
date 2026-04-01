import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize, of } from 'rxjs';
import {
  DataTableActionButton,
  DataTableActionPayload,
  DataTableComponent,
} from '../../../../shared/components/data-table/data-table.component';
import { CreateUserModalComponent } from '../../components/create-user-modal/create-user-modal.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { LoadingService } from '../../../../core/services/loading.service';
import { UsersService } from '../../../../core/services/users.service';
import type { UserFormModalContext, UserRow } from '../../types';

type UserToggleConfirm = { mode: 'desactivar'; user: UserRow } | { mode: 'activar'; user: UserRow };

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [ConfirmDialogComponent, CreateUserModalComponent, DataTableComponent, StatCardComponent],
  templateUrl: './usersPage.component.html',
  styleUrl: './usersPage.component.css',
})
export class UsersPage implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly loadingService = inject(LoadingService);

  readonly tablePageSize = 5;
  readonly userTableHeaders = ['Nombre', 'Correo', 'Rol', 'Estado'] as const;
  readonly userTableColumnClasses = ['font-medium', 'text-base-content/70', '', ''] as const;

  /** Botones de acción según si el usuario está activo o inactivo. */
  readonly userTableActionsForRow = (row: unknown): readonly DataTableActionButton[] => {
    const u = row as UserRow;
    const base: DataTableActionButton[] = [
      { id: 'ver', iconClass: 'ri-eye-line', label: 'Ver usuario', title: 'Ver' },
      { id: 'editar', iconClass: 'ri-pencil-line', label: 'Editar usuario', title: 'Editar' },
    ];
    base.push( u.active ? {
        id: 'desactivar',
        iconClass: 'ri-user-unfollow-line',
        label: 'Desactivar usuario',
        title: 'Desactivar',
        buttonClass: 'text-error',
      } : {
      id: 'activar',
      iconClass: 'ri-user-follow-line',
      label: 'Activar usuario',
      title: 'Activar',
      buttonClass: 'text-success',
    });

    return base;

  };

  readonly users = signal<UserRow[]>([]);

  /** Confirmación de activar / desactivar (null = modal cerrado). */
  protected readonly userPendingAction = signal<UserToggleConfirm | null>(null);

  /** Modal crear / editar usuario (`null` = cerrado). */
  protected readonly userFormModal = signal<UserFormModalContext | null>(null);

  readonly statTotal = computed(() => this.users().length);
  readonly statActivos = computed(() => this.users().filter((u) => u.active).length);
  readonly statInactivos = computed(() => this.users().filter((u) => !u.active).length);

  readonly userTableRows = computed(() =>
    this.users().map((u) => [u.name, u.email, u.role, u.active ? 'Activo' : 'Inactivo']),
  );

  readonly usersForTableActions = computed(() => this.users());

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loadingService.setLoading(true);
    this.usersService
      .getUsers()
      .pipe(
        catchError((err: unknown) => {
          toast.error('Ocurrió un error al intentar obtener la lista de usuarios');
          return of([] as UserRow[]);
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe((list) => this.users.set(list));
  }

  onUserTableAction(event: DataTableActionPayload): void {
    const user = event.row as UserRow;
    const byId: Record<string, (u: UserRow, e: DataTableActionPayload) => void> = {
      ver: (u) => this.onVerUsuario(u),
      editar: (u) => this.onEditarUsuario(u),
      desactivar: (u) => this.onDesactivarUsuario(u),
      activar: (u) => this.onActivarUsuario(u),
    };
    byId[event.actionId]?.(user, event);
  }

  private onVerUsuario(user: UserRow): void {
    this.userFormModal.set({ mode: 'view', userId: user.id });
  }

  private onEditarUsuario(user: UserRow): void {
    this.userFormModal.set({ mode: 'edit', userId: user.id });
  }

  private onDesactivarUsuario(user: UserRow): void {
    this.userPendingAction.set({ mode: 'desactivar', user });
  }

  private onActivarUsuario(user: UserRow): void {
    this.userPendingAction.set({ mode: 'activar', user });
  }

  protected openCreateUserModal(): void {
    this.userFormModal.set({ mode: 'create' });
  }

  protected closeUserFormModal(): void {
    this.userFormModal.set(null);
  }

  protected onUserFormSaved(): void {
    this.userFormModal.set(null);
    this.loadUsers();
  }

  protected cancelUserAction(): void {
    this.userPendingAction.set(null);
  }

  protected confirmUserAction(): void {
    const ctx = this.userPendingAction();
    if (!ctx) return;

    const isDesactivar = ctx.mode === 'desactivar';
    const req$ = isDesactivar
      ? this.usersService.desactivarUser(ctx.user.id)
      : this.usersService.activarUser(ctx.user.id);

    this.loadingService.setLoading(true);
    req$
      .pipe(
        catchError(() => {
          toast.error(isDesactivar ? 'No se pudo desactivar el usuario' : 'No se pudo activar el usuario');
          return EMPTY;
        }),
        finalize(() => this.loadingService.setLoading(false)),
      )
      .subscribe(() => {
        toast.success(isDesactivar ? 'Usuario desactivado correctamente' : 'Usuario activado correctamente');
        this.loadUsers();
        this.userPendingAction.set(null);
      });
  }
}

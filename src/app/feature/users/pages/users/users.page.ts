import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toast } from 'ngx-sonner';
import { catchError, finalize, of } from 'rxjs';
import {
  DataTableActionButton,
  DataTableActionPayload,
  DataTableComponent,
} from '../../../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { UsersService } from '../../../../core/services/users.service';
import type { UserRow } from '../../types';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [DataTableComponent, StatCardComponent],
  templateUrl: './users-page.html',
  styleUrl: './users.page.css',
})
export class UsersPage implements OnInit {
  private readonly usersService = inject(UsersService);

  readonly tablePageSize = 5;
  readonly userTableHeaders = ['Nombre', 'Correo', 'Rol', 'Estado'] as const;
  readonly userTableColumnClasses = ['font-medium', 'text-base-content/70', '', ''] as const;

  readonly userTableActionButtons: DataTableActionButton[] = [
    { id: 'ver', iconClass: 'ri-eye-line', label: 'Ver usuario', title: 'Ver' },
    { id: 'editar', iconClass: 'ri-pencil-line', label: 'Editar usuario', title: 'Editar' },
    {
      id: 'eliminar',
      iconClass: 'ri-delete-bin-line',
      label: 'Eliminar usuario',
      title: 'Eliminar',
      buttonClass: 'text-error',
    },
  ];

  readonly users = signal<UserRow[]>([]);
  readonly loading = signal(false);

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
    this.loading.set(true);
    this.usersService
      .getUsers()
      .pipe(
        catchError((err: unknown) => {
          toast.error('Ocurrió un error al intentar obtener la lista de usuarios');
          return of([] as UserRow[]);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((list) => this.users.set(list));
  }

  onUserTableAction(event: DataTableActionPayload): void {
    const user = event.row as UserRow;
    const byId: Record<string, (u: UserRow, e: DataTableActionPayload) => void> = {
      ver: (u) => this.onVerUsuario(u),
      editar: (u) => this.onEditarUsuario(u),
      eliminar: (u) => this.onEliminarUsuario(u),
    };
    byId[event.actionId]?.(user, event);
  }

  private onVerUsuario(user: UserRow): void {
    alert('Ver usuario');
    console.log(user);
  }

  private onEditarUsuario(user: UserRow): void {
    alert('Editar usuario');
    console.log(user);
  }

  private onEliminarUsuario(user: UserRow): void {
    alert('Eliminar usuario');
    console.log(user);
  }
}

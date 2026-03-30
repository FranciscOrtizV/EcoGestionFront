import { Component, computed } from '@angular/core';
import {
  DataTableActionButton,
  DataTableActionPayload,
  DataTableComponent,
} from '../../../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';

type DummyUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [DataTableComponent, StatCardComponent],
  templateUrl: './users-page.html',
  styleUrl: './users.page.css',
})
export class UsersPage {

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

  private readonly allUsers: DummyUserRow[] = [
    { id: '1', name: 'Ana Pérez', email: 'ana.perez@ejemplo.cl', role: 'Administrador', active: true },
    { id: '2', name: 'Carlos Ruiz', email: 'carlos.ruiz@ejemplo.cl', role: 'Conductor', active: true },
    { id: '3', name: 'María López', email: 'maria.lopez@ejemplo.cl', role: 'Planificador', active: false },
    { id: '4', name: 'Pedro Soto', email: 'pedro.soto@ejemplo.cl', role: 'Supervisor', active: true },
  ];

  readonly userTableRows = computed(() =>
    this.allUsers.map((u) => [u.name, u.email, u.role, u.active ? 'Activo' : 'Inactivo']),
  );

  readonly usersForTableActions = computed(() => this.allUsers);

  onUserTableAction(event: DataTableActionPayload): void {
    const user = event.row as DummyUserRow;
    const byId: Record<string, (u: DummyUserRow, e: DataTableActionPayload) => void> = {
      ver: (u) => this.onVerUsuario(u),
      editar: (u) => this.onEditarUsuario(u),
      eliminar: (u) => this.onEliminarUsuario(u),
    };
    byId[event.actionId]?.(user, event);
  }

  private onVerUsuario(user: DummyUserRow): void {
    alert('Ver usuario');
    console.log(user);
  }

  private onEditarUsuario(user: DummyUserRow): void {
    alert('Editar usuario');
    console.log(user);
  }

  private onEliminarUsuario(user: DummyUserRow): void {
    alert('Eliminar usuario');
    console.log(user);
  }
}

export interface UserRole {
  id: string;
  nombre: string;
}

export interface CurrentUser {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  phone: string;
  isActive: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  roles: UserRole[];
}

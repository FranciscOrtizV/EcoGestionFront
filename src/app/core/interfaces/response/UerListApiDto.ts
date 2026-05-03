export interface UserListApiDto {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  phone: string;
  isActive: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  roles?: { id: string; nombre: string }[];
}

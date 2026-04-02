export type VehiculoFormModalContext =
  | { mode: 'create' }
  | { mode: 'edit'; vehiculoId: string }
  | { mode: 'view'; vehiculoId: string };

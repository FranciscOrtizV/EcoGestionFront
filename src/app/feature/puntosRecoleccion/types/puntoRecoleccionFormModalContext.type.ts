export type PuntoRecoleccionFormModalContext =
  | { mode: 'create' }
  | { mode: 'edit'; puntoId: string }
  | { mode: 'view'; puntoId: string };

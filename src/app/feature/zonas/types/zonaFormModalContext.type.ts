export type ZonaFormModalContext =
  | { mode: 'create' }
  | { mode: 'edit'; zonaId: string }
  | { mode: 'view'; zonaId: string };

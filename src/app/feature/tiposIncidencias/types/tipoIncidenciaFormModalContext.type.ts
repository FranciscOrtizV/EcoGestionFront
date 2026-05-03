export type TipoIncidenciaFormModalContext =
  | { mode: 'create' }
  | { mode: 'edit'; tipoIncidenciaId: string }
  | { mode: 'view'; tipoIncidenciaId: string };

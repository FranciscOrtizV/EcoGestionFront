export type UserFormModalContext =
  | { mode: 'create' }
  | { mode: 'edit'; userId: string }
  | { mode: 'view'; userId: string };

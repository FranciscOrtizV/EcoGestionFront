export type SidebarNavEntry =
  | { kind: 'section'; id: string; label: string }
  | {
      kind: 'link';
      id: string;
      iconClass: string;
      label: string;
      badge?: { text: string; variant: 'red' | 'green' };
    }
  | {
      kind: 'dropdown';
      id: string;
      iconClass: string;
      label: string;
      group: SidebarDropdownGroup;
      children: { label: string }[];
    };

export type SidebarDropdownGroup = 'users' | 'post';

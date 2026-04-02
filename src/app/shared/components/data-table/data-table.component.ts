import { NgClass } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';

export type DataTableCell = string | number;

export type DataTableActionButton = {
  id: string;
  /** Clases del icono (p. ej. `ri-eye-line`). */
  iconClass: string;
  /** Texto para `aria-label` y título por defecto. */
  label: string;
  /** `title` del botón; si se omite, se usa `label`. */
  title?: string;
  /** Clases extra en el botón (p. ej. `text-error`). */
  buttonClass?: string;
};

/** Badge en una columna: usa `successWhen` (éxito vs ghost) o `badgeClass` (clases por texto de celda). */
export type DataTableBadgeColumn = {
  index: number;
  successWhen?: string;
  badgeClass?: (cell: string) => string;
};

export type DataTableActionPayload = {
  actionId: string;
  row: unknown;
  /** Índice 0-based dentro de la página visible. */
  pageIndex: number;
  /** Índice 0-based dentro del resultado filtrado (todas las páginas). */
  filteredIndex: number;
};

type RowEntry = {
  readonly cells: readonly DataTableCell[];
  readonly model: unknown;
};

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgClass],
  templateUrl: './data-table.component.html',
})
export class DataTableComponent {
  headers = input.required<readonly string[]>();
  rows = input.required<readonly (readonly DataTableCell[])[]>();
  columnCellClasses = input<readonly (string | undefined)[]>([]);
  columnHeaderClasses = input<readonly (string | undefined)[]>([]);
  emptyMessage = input<string>('No hay datos para mostrar.');
  zebra = input(true);
  badgeColumn = input<DataTableBadgeColumn | null>(null);

  /** Cabecera de la columna de acciones (solo si hay `actionButtons`). */
  actionsHeader = input<string>('Acciones');
  actionButtons = input<readonly DataTableActionButton[]>([]);
  /**
   * Si se define, devuelve los botones de acción para esa fila (tiene prioridad sobre `actionButtons`).
   */
  actionButtonsForRow = input<((row: unknown) => readonly DataTableActionButton[]) | null>(null);
  /** Misma longitud que `rows`: modelo por fila (se envía en `actionClick`). */
  actionsRowData = input<readonly unknown[]>([]);

  searchable = input(false);
  searchPlaceholder = input<string>('Buscar…');
  searchInputId = input<string>('data-table-search');

  paginate = input(false);
  pageSize = input(10);

  trackByColumnIndex = input<number | null>(null);

  /** Activa ordenación por cabeceras. */
  sortable = input(false);
  /**
   * Índices de columnas ordenables. Si es `null` y `sortable` es true, todas las columnas de datos.
   */
  sortableColumnIndexes = input<readonly number[] | null>(null);

  readonly actionClick = output<DataTableActionPayload>();

  protected readonly internalSearch = signal('');
  private readonly currentPage = signal(1);
  protected readonly sortColumnIndex = signal<number | null>(null);
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');

  protected readonly hasActions = computed(
    () => this.actionButtonsForRow() != null || this.actionButtons().length > 0,
  );

  protected readonly emptyColspan = computed(
    () => this.headers().length + (this.hasActions() ? 1 : 0),
  );

  private readonly rowEntries = computed((): RowEntry[] => {
    const r = this.rows();
    const models = this.actionsRowData();
    return r.map((cells, i) => ({ cells, model: models[i] }));
  });

  protected readonly filteredEntries = computed((): RowEntry[] => {
    const all = this.rowEntries();
    if (!this.searchable()) {
      return all;
    }
    const q = this.internalSearch().trim().toLowerCase();
    if (!q) {
      return all;
    }
    return all.filter((e) => e.cells.some((c) => ('' + c).toLowerCase().includes(q)));
  });

  readonly sortedFilteredEntries = computed((): RowEntry[] => {
    const list = [...this.filteredEntries()];
    const col = this.sortColumnIndex();
    const nCols = this.headers().length;
    if (!this.sortable() || col === null || col < 0 || col >= nCols || !this.isColumnSortable(col)) {
      return list;
    }
    const dir = this.sortDirection();
    const m = dir === 'asc' ? 1 : -1;
    list.sort((x, y) => m * this.compareCellValues(x.cells[col]!, y.cells[col]!));
    return list;
  });

  private readonly pageSizeSafe = computed(() => Math.max(1, this.pageSize()));

  readonly totalPages = computed(() => {
    if (!this.paginate()) {
      return 0;
    }
    const n = this.sortedFilteredEntries().length;
    const ps = this.pageSizeSafe();
    return n === 0 ? 0 : Math.ceil(n / ps);
  });

  readonly effectivePage = computed(() => {
    if (!this.paginate()) {
      return 1;
    }
    const tp = this.totalPages();
    if (tp === 0) {
      return 1;
    }
    return Math.min(Math.max(1, this.currentPage()), tp);
  });

  readonly displayEntries = computed((): RowEntry[] => {
    const list = this.sortedFilteredEntries();
    if (!this.paginate()) {
      return list;
    }
    const page = this.effectivePage();
    const ps = this.pageSizeSafe();
    const start = (page - 1) * ps;
    return list.slice(start, start + ps);
  });

  readonly pageRangeLabel = computed(() => {
    if (!this.paginate()) {
      return '';
    }
    const total = this.sortedFilteredEntries().length;
    if (total === 0) {
      return '0 resultados';
    }
    const page = this.effectivePage();
    const ps = this.pageSizeSafe();
    const from = (page - 1) * ps + 1;
    const to = Math.min(page * ps, total);
    return `Mostrando ${from}–${to} de ${total}`;
  });

  readonly pageNumbers = computed(() => {
    const tp = this.totalPages();
    return Array.from({ length: tp }, (_, i) => i + 1);
  });

  readonly filterEmptyMessage = computed(() => {
    const q = this.internalSearch().trim();
    return q ? `No hay resultados para «${q}».` : this.emptyMessage();
  });

  isColumnSortable(columnIndex: number): boolean {
    if (!this.sortable()) {
      return false;
    }
    const allowed = this.sortableColumnIndexes();
    if (allowed === null) {
      return true;
    }
    return allowed.includes(columnIndex);
  }

  toggleSort(columnIndex: number): void {
    if (!this.isColumnSortable(columnIndex)) {
      return;
    }
    if (this.sortColumnIndex() === columnIndex) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumnIndex.set(columnIndex);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  sortAriaSort(columnIndex: number): 'ascending' | 'descending' | 'none' {
    if (this.sortColumnIndex() !== columnIndex) {
      return 'none';
    }
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  sortButtonAriaLabel(header: string, columnIndex: number): string {
    if (this.sortColumnIndex() !== columnIndex) {
      return `Ordenar por ${header}`;
    }
    return this.sortDirection() === 'asc'
      ? `${header}: orden ascendente (clic para invertir)`
      : `${header}: orden descendente (clic para invertir)`;
  }

  private compareCellValues(a: DataTableCell, b: DataTableCell): number {
    if (typeof a === 'number' && typeof b === 'number') {
      if (a === b) {
        return 0;
      }
      return a < b ? -1 : 1;
    }
    const sa = '' + a;
    const sb = '' + b;
    return sa.localeCompare(sb, undefined, { sensitivity: 'base', numeric: true });
  }

  onSearchInput(event: Event): void {
    this.internalSearch.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  goToPage(n: number): void {
    const tp = this.totalPages();
    if (n >= 1 && n <= tp) {
      this.currentPage.set(n);
    }
  }

  goPrevPage(): void {
    this.currentPage.update((p) => Math.max(1, p - 1));
  }

  goNextPage(): void {
    const tp = this.totalPages();
    if (tp === 0) {
      return;
    }
    this.currentPage.update((p) => Math.min(tp, p + 1));
  }

  onActionButtonClick(actionId: string, entry: RowEntry, pageIndex: number): void {
    const offset =
      this.paginate() ? (this.effectivePage() - 1) * this.pageSizeSafe() : 0;
    const filteredIndex = offset + pageIndex;
    this.actionClick.emit({
      actionId,
      row: entry.model,
      pageIndex,
      filteredIndex,
    });
  }

  rowTrackKey(index: number): string {
    const list = this.displayEntries();
    const e = list[index];
    if (!e) {
      return `row-${index}`;
    }
    const c = this.trackByColumnIndex();
    if (c != null && e.cells[c] !== undefined) {
      return `${c}:${e.cells[c]}`;
    }
    return e.cells.map((x) => '' + x).join('|');
  }

  thClass(i: number): string {
    return this.columnHeaderClasses()[i] ?? '';
  }

  tdClass(i: number): string {
    return this.columnCellClasses()[i] ?? '';
  }

  actionTitle(btn: DataTableActionButton): string {
    return btn.title ?? btn.label;
  }

  protected actionButtonsForEntry(entry: RowEntry): readonly DataTableActionButton[] {
    const fn = this.actionButtonsForRow();
    if (fn) {
      return fn(entry.model);
    }
    return this.actionButtons();
  }
}

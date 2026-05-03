import { Component, input, output } from '@angular/core';

/** Colores de botón DaisyUI para “Confirmar” (`btn-*`). */
export type ConfirmDialogConfirmColor =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  title = input.required<string>();
  message = input.required<string>();

  /** Color del botón Confirmar (por defecto `primary`). */
  confirmButtonColor = input<ConfirmDialogConfirmColor>('primary');

  confirmed = output<void>();
  cancelled = output<void>();

  protected onConfirm(): void {
    this.confirmed.emit();
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }
}

import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [NgClass],
  templateUrl: './loading-overlay.component.html',
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class LoadingOverlayComponent {
  /** Cuando es true, muestra la capa encima del contenido proyectado. */
  loading = input(false);

  /** Clases extra en el contenedor relativo (p. ej. `min-h-[200px] rounded-box`). */
  wrapperClass = input<string>('');

  /** Clases extra en la capa oscura (opacidad, blur, etc.). */
  overlayClass = input<string>('');
}

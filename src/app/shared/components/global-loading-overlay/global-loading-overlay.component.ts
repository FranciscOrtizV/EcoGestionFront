import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-global-loading-overlay',
  standalone: true,
  templateUrl: './global-loading-overlay.component.html',
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class GlobalLoadingOverlayComponent {
  protected readonly loading = inject(LoadingService).loading;
}

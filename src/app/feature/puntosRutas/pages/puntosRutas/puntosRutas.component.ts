import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  DataTableActionButton,
  DataTableActionPayload,
  DataTableComponent,
} from '../../../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingService } from '../../../../core/services/loading.service';
import { ZonasService } from '../../../../core/services/zonas.service';
import { toast } from 'ngx-sonner';
import { catchError, EMPTY, finalize, of } from 'rxjs';

@Component({
  selector: 'app-zonas-page',
  standalone: true,
  imports: [],
  templateUrl: './puntosRutas.component.html',
  styleUrl: './puntosRutas.component.css',
})
export class PuntosRutasPage {

}

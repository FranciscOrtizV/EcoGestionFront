import { Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarDropdownGroup } from '../../types';
import { resolveSidebarByRoles } from './utils/sidebar-nav-entries';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard-sidebar.component.html',
  styleUrl: './dashboard-sidebar.component.css'
})
export class DashboardSidebarComponent {
  private readonly auth = inject(AuthService);

  readonly sidebarEntries = computed(() => resolveSidebarByRoles(this.auth.currentUser()));

  @Input() sidebarOpen = true;
  @Input() selectedSidebarGroup: SidebarDropdownGroup | null = null;

  @Output() closeOverlay = new EventEmitter<void>();
  @Output() dropdownToggle = new EventEmitter<{ event: Event; group: SidebarDropdownGroup }>();

  onOverlayClick(): void {
    this.closeOverlay.emit();
  }

  onDropdownClick(event: Event, group: SidebarDropdownGroup): void {
    this.dropdownToggle.emit({ event, group });
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  templateUrl: './dashboard-sidebar.component.html',
  styleUrl: './dashboard-sidebar.component.css'
})
export class DashboardSidebarComponent {
  @Input() sidebarOpen = true;
  @Input() selectedSidebarGroup: 'users' | 'post' | null = null;

  @Output() closeOverlay = new EventEmitter<void>();
  @Output() dropdownToggle = new EventEmitter<{ event: Event; group: 'users' | 'post' }>();

  onOverlayClick(): void {
    this.closeOverlay.emit();
  }

  onDropdownClick(event: Event, group: 'users' | 'post'): void {
    this.dropdownToggle.emit({ event, group });
  }
}

import { Component, EventEmitter, HostListener, Output } from '@angular/core';

@Component({
  selector: 'app-dashboard-navbar',
  standalone: true,
  templateUrl: './dashboard-navbar.component.html',
  styleUrl: './dashboard-navbar.component.css'
})
export class DashboardNavbarComponent {
  @Output() menuToggle = new EventEmitter<void>();
  @Output() logoutRequested = new EventEmitter<void>();

  profileDropdownOpen = false;

  onMenuClick(): void {
    this.menuToggle.emit();
  }

  toggleProfileDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.profileDropdownOpen = !this.profileDropdownOpen;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.profileDropdownOpen = false;
  }

  onLogoutClick(event: Event): void {
    event.preventDefault();
    this.profileDropdownOpen = false;
    this.logoutRequested.emit();
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }
}

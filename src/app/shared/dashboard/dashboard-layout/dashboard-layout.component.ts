import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { DashboardNavbarComponent } from '../dashboard-navbar/dashboard-navbar.component';
import { DashboardSidebarComponent } from '../dashboard-sidebar/dashboard-sidebar.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, DashboardSidebarComponent, DashboardNavbarComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css'
})
export class DashboardLayoutComponent {
  sidebarOpen = true;
  selectedSidebarGroup: 'users' | 'post' | null = null;

  constructor(
    readonly auth: AuthService,
    private readonly router: Router
  ) {}

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  toggleSidebarDropdown(event: Event, group: 'users' | 'post'): void {
    event.preventDefault();
    this.selectedSidebarGroup = this.selectedSidebarGroup === group ? null : group;
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

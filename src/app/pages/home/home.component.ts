import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  /** Panel lateral abierto; el script inline del HTML no se ejecuta en Angular. */
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

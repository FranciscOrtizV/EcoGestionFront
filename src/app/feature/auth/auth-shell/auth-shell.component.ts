import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Contenedor del feature auth: aquí se anidan login, registro, etc. */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class AuthShellComponent {}

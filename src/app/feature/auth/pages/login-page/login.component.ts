import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Errores del servidor (credenciales incorrectas, red, etc.) */
  serverError = false;

  readonly form = this.fb.nonNullable.group({
    email: this.fb.nonNullable.control('', {
      validators: [
        Validators.required,
        Validators.minLength(5),
        Validators.email
      ]
    }),
    password: this.fb.nonNullable.control('', {
      validators: [Validators.required]
    })
  });

  /** Para estilos y plantilla */
  get emailInvalid(): boolean {
    const c = this.form.controls.email;
    return c.invalid && c.touched;
  }

  get passwordInvalid(): boolean {
    const c = this.form.controls.password;
    return c.invalid && c.touched;
  }

  submit(): void {
    this.serverError = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      toast.warning('Revisa los campos del formulario.');
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.auth.login({ email, password }).subscribe({
      next: () => {
        toast.success('Sesión iniciada correctamente.');
        void this.router.navigateByUrl('/admin');
      },
      error: (error) => {
        this.serverError = true;
        toast.error('Credenciales invalidas');
      }
    });
  }
}

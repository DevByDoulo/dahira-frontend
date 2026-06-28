import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  telephone = '';
  password = '';
  rememberMe = false;
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const msg = nav?.extras?.state?.['successMessage'] as string | undefined;
    if (msg) this.successMessage = msg;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (!this.telephone || !this.password) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({ telephone: this.telephone, password: this.password }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          const role = this.authService.getUser()?.role;
          this.router.navigate([role === 'super_admin' ? '/super-admin' : '/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 429) {
          this.errorMessage = err.error?.message || 'Trop de tentatives. Réessayez dans 15 minutes.';
        } else {
          this.errorMessage = err.error?.message || 'Téléphone ou mot de passe incorrect';
        }
      }
    });
  }
}

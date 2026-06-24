import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-mot-de-passe-oublie',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mot-de-passe-oublie.component.html',
  styleUrls: ['./mot-de-passe-oublie.component.css'],
})
export class MotDePasseOublieComponent {
  telephone = '';
  isLoading = false;
  errorMessage = '';
  successTelephone = '';
  showSuccess = false;

  private readonly apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  onSubmit() {
    if (!this.telephone) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.http
      .post<{ success: boolean; data: { message: string } }>(
        `${this.apiUrl}/password-reset/request`,
        { telephone: this.telephone },
      )
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.successTelephone = this.telephone;
          this.showSuccess = true;
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        },
      });
  }

  dismissSuccess() {
    this.router.navigate(['/login']);
  }
}

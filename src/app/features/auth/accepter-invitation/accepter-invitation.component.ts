import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-accepter-invitation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './accepter-invitation.component.html',
})
export class AccepterInvitationComponent implements OnInit {
  token = '';
  tokenMissing = false;

  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;

  isLoading = false;
  errorMessage = '';
  showSuccess = false;

  private readonly apiUrl = environment.apiUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) this.tokenMissing = true;
  }

  get strengthScore(): number {
    const v = this.password;
    let score = 0;
    if (v.length >= 8) score += 25;
    if (v.length > 12) score += 25;
    if (/[A-Z]/.test(v)) score += 25;
    if (/[0-9]/.test(v) || /[^A-Za-z0-9]/.test(v)) score += 25;
    return score;
  }

  get strengthLabel(): string {
    if (this.strengthScore === 0) return 'Très faible';
    if (this.strengthScore <= 50) return 'Moyen';
    if (this.strengthScore <= 75) return 'Bon';
    return 'Excellent';
  }

  get strengthColor(): string {
    if (this.strengthScore === 0) return 'bg-error';
    if (this.strengthScore <= 50) return 'bg-orange-500';
    return 'bg-secondary';
  }

  get passwordsMatch(): boolean {
    return this.confirmPassword === '' || this.password === this.confirmPassword;
  }

  get canSubmit(): boolean {
    return this.password.length >= 8 && this.password === this.confirmPassword && !this.isLoading;
  }

  onSubmit(): void {
    if (!this.canSubmit) return;
    this.isLoading = true;
    this.errorMessage = '';

    this.http
      .post<{ success: boolean }>(`${this.apiUrl}/invitations/accept`, {
        token: this.token,
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/login'], {
            state: { successMessage: 'Compte créé avec succès, vous pouvez vous connecter.' },
          });
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage =
            err.error?.message ?? 'Lien invalide ou expiré. Veuillez contacter votre administrateur.';
        },
      });
  }
}

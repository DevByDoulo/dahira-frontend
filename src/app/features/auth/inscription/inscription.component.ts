import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inscription.component.html',
})
export class InscriptionComponent {
  etape = 1;
  isLoading = false;
  errorMessage = '';

  // Étape 1 — Dahira
  dahiraNom = '';
  dahiraVille = '';
  dahiraTelephone = '';

  // Étape 2 — Admin
  userNom = '';
  userTelephone = '';
  userEmail = '';
  userPassword = '';
  userPasswordConfirm = '';
  showPassword = false;
  showPasswordConfirm = false;

  constructor(private authService: AuthService, private router: Router) {}

  etape1Valide(): boolean {
    return this.dahiraNom.trim().length >= 2;
  }

  passerEtape2(): void {
    if (!this.etape1Valide()) return;
    this.errorMessage = '';
    this.etape = 2;
  }

  retourEtape1(): void {
    this.etape = 1;
    this.errorMessage = '';
  }

  soumettre(): void {
    this.errorMessage = '';

    if (!this.userNom.trim()) {
      this.errorMessage = 'Votre nom est requis.';
      return;
    }
    if (!this.userTelephone.trim()) {
      this.errorMessage = 'Votre numéro de téléphone est requis.';
      return;
    }
    if (this.userPassword.length < 8) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(this.userPassword)) {
      this.errorMessage = 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre.';
      return;
    }
    if (this.userPassword !== this.userPasswordConfirm) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.isLoading = true;
    this.authService
      .registerDahira({
        dahira: {
          nom: this.dahiraNom.trim(),
          ville: this.dahiraVille.trim(),
          telephone: this.dahiraTelephone.trim(),
        },
        user: {
          nom: this.userNom.trim(),
          telephone: this.userTelephone.trim(),
          email: this.userEmail.trim(),
          password: this.userPassword,
        },
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.errorMessage = err?.error?.message ?? 'Une erreur est survenue. Veuillez réessayer.';
          this.isLoading = false;
        },
      });
  }
}

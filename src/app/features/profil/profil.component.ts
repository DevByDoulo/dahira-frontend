import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { MembresService, Membre } from '../../core/services/membres.service';

type Onglet = 'informations' | 'securite';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profil.component.html',
})
export class ProfilComponent implements OnInit {
  isLoading = true;
  user: UserProfile | null = null;
  membre: Membre | null = null;
  errorMessage = '';

  ongletActif: Onglet = 'informations';
  readonly backendUrl = 'http://localhost:3000';

  // Formulaire changement de mot de passe
  ancienPassword = '';
  nouveauPassword = '';
  confirmerPassword = '';
  isChangingPassword = false;
  passwordSuccess = '';
  passwordError = '';

  constructor(
    private authService: AuthService,
    private membresService: MembresService,
  ) {}

  ngOnInit(): void {
    this.authService.getMe().subscribe({
      next: (res) => {
        if (res.success) {
          this.user = res.data;
          if (res.data.membre_id) {
            this.membresService.getMembre(res.data.membre_id).subscribe({
              next: (r) => { if (r.success) this.membre = r.data; },
            });
          }
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger le profil.';
        this.isLoading = false;
      },
    });
  }

  setOnglet(o: Onglet): void {
    this.ongletActif = o;
    this.passwordSuccess = '';
    this.passwordError = '';
  }

  get avatarSrc(): string | null {
    const url = this.user?.photo_url;
    if (!url) return null;
    return url.startsWith('http') ? url : `${this.backendUrl}${url}`;
  }

  get initiales(): string {
    if (!this.user?.nom) return '?';
    return this.user.nom
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  get roleLabel(): string {
    switch (this.user?.role) {
      case 'bureau': return 'Administrateur';
      case 'tresorier': return 'Trésorier';
      default: return 'Membre';
    }
  }

  get roleBadgeClass(): string {
    switch (this.user?.role) {
      case 'bureau': return 'bg-primary text-on-primary';
      case 'tresorier': return 'bg-secondary-container text-on-secondary-container';
      default: return 'bg-surface-container text-on-surface-variant';
    }
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  changerMotDePasse(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (!this.ancienPassword || !this.nouveauPassword || !this.confirmerPassword) {
      this.passwordError = 'Veuillez remplir tous les champs.';
      return;
    }
    if (this.nouveauPassword !== this.confirmerPassword) {
      this.passwordError = 'Les nouveaux mots de passe ne correspondent pas.';
      return;
    }
    if (this.nouveauPassword.length < 6) {
      this.passwordError = 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
      return;
    }

    this.isChangingPassword = true;
    this.authService.changePassword(this.ancienPassword, this.nouveauPassword).subscribe({
      next: (res) => {
        this.passwordSuccess = res.data?.message ?? 'Mot de passe modifié avec succès.';
        this.ancienPassword = '';
        this.nouveauPassword = '';
        this.confirmerPassword = '';
        this.isChangingPassword = false;
      },
      error: (err) => {
        this.passwordError = err?.error?.message ?? 'Erreur lors du changement de mot de passe.';
        this.isChangingPassword = false;
      },
    });
  }
}

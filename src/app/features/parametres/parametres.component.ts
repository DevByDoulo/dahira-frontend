import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

type Section = 'profil' | 'securite';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametres.component.html',
})
export class ParametresComponent implements OnInit {
  isLoading = true;
  user: UserProfile | null = null;
  activeSection: Section = 'profil';

  photoUrl: string | null = null;
  isUploadingPhoto = false;
  photoError = '';
  readonly backendUrl = environment.backendUrl;

  prenom = '';
  nomFamille = '';
  email = '';
  telephone = '';

  ancienMotDePasse = '';
  nouveauMotDePasse = '';
  confirmerMotDePasse = '';

  isSavingProfile = false;
  isSavingPassword = false;
  profileSuccess = '';
  profileError = '';
  passwordSuccess = '';
  passwordError = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.getMe().subscribe({
      next: (res) => {
        if (res.success) {
          this.user = res.data;
          const parts = res.data.nom.trim().split(' ');
          this.prenom = parts[0] ?? '';
          this.nomFamille = parts.slice(1).join(' ');
          this.email = res.data.email ?? '';
          this.telephone = res.data.telephone ?? '';
          this.photoUrl = res.data.photo_url ?? null;
        }
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  get isSuperAdmin(): boolean {
    return this.user?.role === 'super_admin';
  }

  get roleLabel(): string {
    switch (this.user?.role) {
      case 'super_admin':     return 'Super Administrateur';
      case 'secretaire_general': return 'Secrétaire Général';
      case 'adjoint':            return 'Adjoint';
      case 'tresorier':       return 'Trésorier';
      case 'responsable_org': return 'Communicateur';
      default:                return 'Membre';
    }
  }

  get roleBadgeClass(): string {
    switch (this.user?.role) {
      case 'super_admin': return 'bg-error/15 text-error';
      case 'secretaire_general': return 'bg-primary text-on-primary';
      case 'adjoint':            return 'bg-primary text-on-primary';
      case 'tresorier':   return 'bg-secondary-container text-on-secondary-container';
      default:            return 'bg-surface-container text-on-surface-variant';
    }
  }

  get avatarSrc(): string | null {
    if (!this.photoUrl) return null;
    return this.photoUrl.startsWith('http') ? this.photoUrl : `${this.backendUrl}${this.photoUrl}`;
  }

  ouvrirSelecteurPhoto(): void {
    document.getElementById('photo-input')?.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.photoError = 'Format non supporté. Utilisez JPG, PNG ou WebP.';
      return;
    }

    this.isUploadingPhoto = true;
    this.photoError = '';
    const fd = new FormData();
    fd.append('photo', file);

    this.authService.updatePhoto(fd).subscribe({
      next: (res) => {
        if (res.success) {
          this.photoUrl = res.data.photo_url;
        }
        this.isUploadingPhoto = false;
        input.value = '';
      },
      error: (err) => {
        this.photoError = err?.error?.message ?? 'Erreur lors de l\'upload de la photo.';
        this.isUploadingPhoto = false;
        input.value = '';
      },
    });
  }

  get initiales(): string {
    const a = this.prenom.trim().charAt(0).toUpperCase();
    const b = this.nomFamille.trim().charAt(0).toUpperCase();
    return a + b || this.prenom.trim().charAt(0).toUpperCase() || '?';
  }

  setSection(s: Section): void {
    this.activeSection = s;
  }

  sauvegarder(): void {
    if (!this.prenom.trim()) {
      this.profileError = 'Le prénom est obligatoire.';
      return;
    }
    this.isSavingProfile = true;
    this.profileError = '';
    this.profileSuccess = '';
    const nom = [this.prenom.trim(), this.nomFamille.trim()].filter(Boolean).join(' ');
    this.authService.updateProfile({ nom, telephone: this.telephone, email: this.email }).subscribe({
      next: () => {
        this.profileSuccess = 'Profil mis à jour avec succès.';
        this.isSavingProfile = false;
      },
      error: (err) => {
        this.profileError = err?.error?.message ?? 'Erreur lors de la mise à jour.';
        this.isSavingProfile = false;
      },
    });
  }

  annuler(): void {
    if (!this.user) return;
    const parts = this.user.nom.trim().split(' ');
    this.prenom = parts[0] ?? '';
    this.nomFamille = parts.slice(1).join(' ');
    this.email = this.user.email ?? '';
    this.telephone = this.user.telephone ?? '';
    this.profileError = '';
    this.profileSuccess = '';
  }

  changerMotDePasse(): void {
    this.passwordError = '';
    if (!this.ancienMotDePasse || !this.nouveauMotDePasse) {
      this.passwordError = 'Veuillez remplir tous les champs.';
      return;
    }
    if (this.nouveauMotDePasse.length < 6) {
      this.passwordError = 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
      return;
    }
    if (this.nouveauMotDePasse !== this.confirmerMotDePasse) {
      this.passwordError = 'Les mots de passe ne correspondent pas.';
      return;
    }
    this.isSavingPassword = true;
    this.passwordSuccess = '';
    this.authService.changePassword(this.ancienMotDePasse, this.nouveauMotDePasse).subscribe({
      next: () => {
        this.passwordSuccess = 'Mot de passe modifié avec succès.';
        this.ancienMotDePasse = '';
        this.nouveauMotDePasse = '';
        this.confirmerMotDePasse = '';
        this.isSavingPassword = false;
      },
      error: (err) => {
        this.passwordError = err?.error?.message ?? 'Mot de passe actuel incorrect.';
        this.isSavingPassword = false;
      },
    });
  }
}

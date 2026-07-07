import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

type Onglet = 'informations' | 'securite';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profil.component.html',
})
export class ProfilComponent implements OnInit {
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;

  isLoading = true;
  user: UserProfile | null = null;
  errorMessage = '';

  ongletActif: Onglet = 'informations';
  readonly backendUrl = environment.apiUrl.replace('/api', '');

  // Upload photo
  isUploadingPhoto = false;
  photoSuccess = '';
  photoError = '';

  // Edition profil
  modeEdition = false;
  editNom = '';
  editEmail = '';
  editTelephone = '';
  isSavingProfile = false;
  profileSuccess = '';
  profileError = '';

  // Formulaire changement de mot de passe
  ancienPassword = '';
  nouveauPassword = '';
  confirmerPassword = '';
  isChangingPassword = false;
  passwordSuccess = '';
  passwordError = '';
  showAncien = false;
  showNouveau = false;
  showConfirmer = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.getMe().subscribe({
      next: (res) => {
        if (res.success) {
          this.user = res.data;
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

  ouvrirChoixPhoto(): void {
    this.photoInput?.nativeElement.click();
  }

  onPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      this.photoError = 'Format invalide. Utilisez JPG ou PNG.';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.photoError = 'La photo ne doit pas dépasser 5 Mo.';
      return;
    }

    this.isUploadingPhoto = true;
    this.photoError = '';
    this.photoSuccess = '';

    const formData = new FormData();
    formData.append('photo', file);

    this.authService.updatePhoto(formData).subscribe({
      next: (res) => {
        if (res.success && this.user) {
          this.user = { ...this.user, photo_url: res.data.photo_url, thumbnail_url: res.data.thumbnail_url };
        }
        this.photoSuccess = 'Photo mise à jour avec succès.';
        this.isUploadingPhoto = false;
        if (this.photoInput) this.photoInput.nativeElement.value = '';
      },
      error: (err) => {
        this.photoError = err?.error?.message ?? "Erreur lors de l'upload.";
        this.isUploadingPhoto = false;
      },
    });
  }

  entrerEdition(): void {
    if (!this.user) return;
    this.editNom = this.user.nom ?? '';
    this.editEmail = this.user.email ?? '';
    this.editTelephone = this.user.telephone ?? '';
    this.profileError = '';
    this.profileSuccess = '';
    this.modeEdition = true;
  }

  annulerEdition(): void {
    this.modeEdition = false;
    this.profileError = '';
    this.profileSuccess = '';
  }

  sauvegarderProfil(): void {
    if (!this.editNom.trim()) {
      this.profileError = 'Le nom est obligatoire.';
      return;
    }
    this.isSavingProfile = true;
    this.profileError = '';
    this.authService
      .updateProfile({ nom: this.editNom.trim(), email: this.editEmail, telephone: this.editTelephone })
      .subscribe({
        next: (res) => {
          if (res.success) this.user = res.data;
          this.profileSuccess = 'Profil mis à jour avec succès.';
          this.modeEdition = false;
          this.isSavingProfile = false;
        },
        error: (err) => {
          this.profileError = err?.error?.message ?? 'Erreur lors de la mise à jour.';
          this.isSavingProfile = false;
        },
      });
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
      case 'secretaire_general': return 'Secrétaire Général';
      case 'adjoint':            return 'Adjoint';
      case 'tresorier':       return 'Trésorier';
      case 'responsable_org': return 'Communicateur';
      default:                return 'Membre';
    }
  }

  get roleBadgeClass(): string {
    switch (this.user?.role) {
      case 'secretaire_general': return 'bg-secondary text-on-secondary';
      case 'adjoint':            return 'bg-secondary text-on-secondary';
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

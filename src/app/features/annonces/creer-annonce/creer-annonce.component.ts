import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AnnoncesService, CreateAnnoncePayload } from '../../../core/services/annonces.service';

@Component({
  selector: 'app-creer-annonce',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creer-annonce.component.html',
})
export class CreerAnnonceComponent {
  titre = '';
  contenu = '';
  categorie = '';
  epingler = false;
  cible: 'tous' | 'bureau' | 'responsable_org' = 'tous';
  selectedFile: File | null = null;
  selectedFileName = '';

  isLoading = false;
  errorMessage = '';
  validationErrors: string[] = [];

  constructor(
    private annoncesService: AnnoncesService,
    private router: Router,
  ) {}

  soumettre(): void {
    this.validationErrors = [];
    if (!this.titre.trim()) this.validationErrors.push('Le titre est obligatoire.');
    if (!this.contenu.trim()) this.validationErrors.push('Le contenu est obligatoire.');
    if (this.validationErrors.length > 0) return;
    if (this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';

    const payload: CreateAnnoncePayload = {
      titre: this.titre.trim(),
      contenu: this.contenu.trim(),
      cible_groupe: this.cible !== 'tous' ? this.cible : undefined,
    };
    if (this.categorie) payload.categorie = this.categorie;

    this.annoncesService.createAnnonce(payload).subscribe({
      next: () => {
        this.router.navigate(['/annonces'], { state: { toast: 'Annonce publiée avec succès.' } });
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur lors de la publication.';
        this.isLoading = false;
      },
    });
  }

  cyclerCible(): void {
    const cycle: typeof this.cible[] = ['tous', 'bureau', 'responsable_org'];
    this.cible = cycle[(cycle.indexOf(this.cible) + 1) % cycle.length];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.selectedFileName = input.files[0].name;
    }
  }

  annuler(): void {
    this.router.navigate(['/annonces']);
  }
}

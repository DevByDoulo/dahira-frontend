import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AnnoncesService } from '../../../core/services/annonces.service';

@Component({
  selector: 'app-modifier-annonce',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modifier-annonce.component.html',
})
export class ModifierAnnonceComponent implements OnInit {
  annonceId!: number;

  titre = '';
  contenu = '';
  categorie = '';
  cible: 'tous' | 'bureau' | 'responsable_org' = 'tous';

  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  validationErrors: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private annoncesService: AnnoncesService,
  ) {}

  ngOnInit(): void {
    this.annonceId = Number(this.route.snapshot.paramMap.get('id'));
    this.annoncesService.getAnnonce(this.annonceId).subscribe({
      next: (res) => {
        if (!res.success) { this.router.navigate(['/annonces']); return; }
        const a = res.data;
        this.titre = a.titre;
        this.contenu = a.contenu;
        this.cible = (a.cible_groupe as 'tous' | 'bureau' | 'responsable_org') ?? 'tous';
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = "Impossible de charger l'annonce.";
        this.isLoading = false;
      },
    });
  }

  cyclerCible(): void {
    const cycle: typeof this.cible[] = ['tous', 'bureau', 'responsable_org'];
    this.cible = cycle[(cycle.indexOf(this.cible) + 1) % cycle.length];
  }

  soumettre(): void {
    this.validationErrors = [];
    if (!this.titre.trim()) this.validationErrors.push('Le titre est obligatoire.');
    if (!this.contenu.trim()) this.validationErrors.push('Le contenu est obligatoire.');
    if (this.validationErrors.length > 0) return;
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: Record<string, string> = {
      titre: this.titre.trim(),
      contenu: this.contenu.trim(),
      cible_groupe: this.cible,
    };

    this.annoncesService.updateAnnonce(this.annonceId, payload as any).subscribe({
      next: () => {
        this.router.navigate(['/annonces'], { state: { toast: 'Annonce modifiée avec succès.' } });
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur lors de la modification.';
        this.isSubmitting = false;
      },
    });
  }

  annuler(): void {
    this.router.navigate(['/annonces']);
  }
}

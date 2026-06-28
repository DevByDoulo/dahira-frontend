import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EvenementsService } from '../../../core/services/evenements.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-modifier-evenement',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './modifier-evenement.component.html',
})
export class ModifierEvenementComponent implements OnInit {
  evenementId!: number;

  titre = '';
  description = '';
  date_evenement = '';
  heure = '';
  lieu = '';
  imageActuelle: string | null = null;
  imageFile: File | null = null;
  imageNom = '';
  imagePreview: string | null = null;

  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  validationErrors: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private evenementsService: EvenementsService,
  ) {}

  ngOnInit(): void {
    this.evenementId = Number(this.route.snapshot.paramMap.get('id'));
    this.evenementsService.getEvenement(this.evenementId).subscribe({
      next: (res) => {
        if (!res.success) { this.router.navigate(['/evenements']); return; }
        const e = res.data;
        this.titre = e.titre;
        this.description = e.description ?? '';
        this.date_evenement = e.date_debut?.slice(0, 10) ?? '';
        this.heure = (e as any).heure ?? '';
        this.lieu = e.lieu ?? '';
        this.imageActuelle = e.image_url
          ? (e.image_url.startsWith('http') ? e.image_url : `${environment.backendUrl}${e.image_url}`)
          : null;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger l\'événement.';
        this.isLoading = false;
      },
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.imageFile = file;
    this.imageNom = file.name;
    const reader = new FileReader();
    reader.onload = (e) => (this.imagePreview = e.target?.result as string);
    reader.readAsDataURL(file);
  }

  resetImage(): void {
    this.imageFile = null;
    this.imagePreview = null;
    this.imageNom = '';
  }

  soumettre(): void {
    this.validationErrors = [];
    if (!this.titre.trim()) this.validationErrors.push('Le titre est obligatoire.');
    if (!this.date_evenement) this.validationErrors.push('La date est obligatoire.');
    if (this.validationErrors.length > 0) return;

    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: Record<string, string> = {
      titre: this.titre.trim(),
      date_debut: this.date_evenement,
    };
    if (this.description.trim()) payload['description'] = this.description.trim();
    if (this.heure) payload['heure'] = this.heure;
    if (this.lieu.trim()) payload['lieu'] = this.lieu.trim();

    this.evenementsService.updateEvenement(this.evenementId, payload as any).subscribe({
      next: () => {
        this.router.navigate(['/evenements', this.evenementId]);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur lors de la modification.';
        this.isSubmitting = false;
      },
    });
  }

  annuler(): void {
    this.router.navigate(['/evenements', this.evenementId]);
  }
}

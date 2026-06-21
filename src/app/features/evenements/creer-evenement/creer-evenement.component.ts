import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EvenementsService, CreateEvenementPayload } from '../../../core/services/evenements.service';

@Component({
  selector: 'app-creer-evenement',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './creer-evenement.component.html',
})
export class CreerEvenementComponent implements OnInit {
  titre = '';
  description = '';
  date_evenement = '';
  heure = '';
  lieu = '';
  capacite_max: number | null = null;
  imageFile: File | null = null;
  imageNom = '';
  imagePreview: string | null = null;

  isLoading = false;
  errorMessage = '';
  validationErrors: string[] = [];

  constructor(
    private evenementsService: EvenementsService,
    private router: Router,
  ) {}

  ngOnInit(): void {}

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

    if (this.isLoading) return;
    this.isLoading = true;
    this.errorMessage = '';
    const payload: CreateEvenementPayload = {
      titre: this.titre.trim(),
      date_evenement: this.date_evenement,
    };
    if (this.description.trim()) payload.description = this.description.trim();
    if (this.heure) payload.heure = this.heure;
    if (this.lieu.trim()) payload.lieu = this.lieu.trim();
    if (this.capacite_max) payload.capacite_max = this.capacite_max;

    this.evenementsService.createEvenement(payload, this.imageFile ?? undefined).subscribe({
      next: () => {
        this.router.navigate(['/evenements'], { state: { toast: 'Événement créé avec succès.' } });
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur lors de la création.';
        this.isLoading = false;
      },
    });
  }

  annuler(): void {
    this.router.navigate(['/evenements']);
  }
}

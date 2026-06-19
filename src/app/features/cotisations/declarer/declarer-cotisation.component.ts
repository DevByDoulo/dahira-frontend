import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  CotisationsService,
  DeclarerCotisationPayload,
} from '../../../core/services/cotisations.service';
import { SeancesService, Seance } from '../../../core/services/seances.service';

@Component({
  selector: 'app-declarer-cotisation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './declarer-cotisation.component.html',
})
export class DeclarerCotisationComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  seances: Seance[] = [];
  chargementSeances = true;

  selectedFileName = '';

  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly modes: { value: 'wave' | 'orange_money'; label: string; icon: string }[] = [
    { value: 'wave', label: 'Wave', icon: 'smartphone' },
    { value: 'orange_money', label: 'Orange Money', icon: 'phonelink_ring' },
  ];

  constructor(
    private fb: FormBuilder,
    private cotisationsService: CotisationsService,
    private seancesService: SeancesService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      seance_id: [null, Validators.required],
      montant: [null, [Validators.required, Validators.min(1)]],
      mode_paiement: ['wave', Validators.required],
      note: [''],
    });
  }

  ngOnInit(): void {
    this.seancesService.getSeances().subscribe({
      next: (res) => {
        this.seances = res.success ? res.data : [];
        this.chargementSeances = false;
      },
      error: () => {
        this.chargementSeances = false;
      },
    });
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFileName = input.files[0].name;
    }
  }

  formatDateSeance(seance: Seance): string {
    return new Date(seance.date_seance).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = { dahira: 'Dahira', mensuelle: 'Mensuelle', autre: 'Autre' };
    return map[type] ?? type;
  }

  get montant() { return this.form.get('montant')!; }
  get seance_id() { return this.form.get('seance_id')!; }

  showToast(message: string, type: 'success' | 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => { this.toast = null; }, 2500);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = '';

    const raw = this.form.value;
    const payload: DeclarerCotisationPayload = {
      seance_id: Number(raw.seance_id),
      montant: Number(raw.montant),
      mode_paiement: raw.mode_paiement,
      ...(raw.note?.trim() ? { note: raw.note.trim() } : {}),
    };

    this.cotisationsService.declarerCotisation(payload).subscribe({
      next: () => {
        this.showToast('Déclaration soumise avec succès !', 'success');
        setTimeout(() => this.router.navigate(['/cotisations']), 1500);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur serveur. Veuillez réessayer.';
        this.isSubmitting = false;
      },
    });
  }
}

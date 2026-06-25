import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CotisationsService, DeclarerCotisationPayload } from '../../../core/services/cotisations.service';
import { SeancesService, Seance } from '../../../core/services/seances.service';

@Component({
  selector: 'app-declarer-cotisation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './declarer-cotisation.component.html',
})
export class DeclarerCotisationComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  submitted = false;

  seances: Seance[] = [];
  chargementSeances = true;

  readonly modes: { value: 'wave' | 'orange_money'; label: string }[] = [
    { value: 'wave', label: 'Wave' },
    { value: 'orange_money', label: 'Orange Money' },
  ];

  constructor(
    private fb: FormBuilder,
    private cotisationsService: CotisationsService,
    private seancesService: SeancesService,
  ) {
    this.form = this.fb.group({
      seance_id: [null, Validators.required],
      montant:   [null, [Validators.required, Validators.min(1)]],
      mode_paiement: ['wave', Validators.required],
      note: [''],
    });
  }

  ngOnInit(): void {
    this.seancesService.getSeances({ cloturee: false, limit: 20 }).subscribe({
      next: (res) => {
        this.seances = res.success ? res.data : [];
        this.chargementSeances = false;
      },
      error: () => { this.chargementSeances = false; },
    });
  }

  get montant()   { return this.form.get('montant')!; }
  get seance_id() { return this.form.get('seance_id')!; }

  formatDateSeance(s: Seance): string {
    return new Date(s.date_seance).toLocaleDateString('fr-FR', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  typeLabel(type: string): string {
    const m: Record<string, string> = {
      hebdomadaire: 'Hebdo', mensuelle: 'Mensuelle', gamou: 'Gamou',
      magal: 'Magal', safar: 'Safar', adiya: 'Adiya', autre: 'Autre',
    };
    return m[type] ?? type;
  }

  nouvelleDeclaration(): void {
    this.form.reset({ mode_paiement: 'wave' });
    this.errorMessage = '';
    this.submitted = false;
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting = true;
    this.errorMessage = '';

    const raw = this.form.value;
    const payload: DeclarerCotisationPayload = {
      seance_id:     Number(raw.seance_id),
      montant:       Number(raw.montant),
      mode_paiement: raw.mode_paiement,
      ...(raw.note?.trim() ? { note: raw.note.trim() } : {}),
    };

    this.cotisationsService.declarerCotisation(payload).subscribe({
      next: () => {
        this.submitted = true;
        this.isSubmitting = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur serveur. Veuillez réessayer.';
        this.isSubmitting = false;
      },
    });
  }
}

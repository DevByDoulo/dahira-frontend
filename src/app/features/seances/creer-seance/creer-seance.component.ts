import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SeancesService } from '../../../core/services/seances.service';

@Component({
  selector: 'app-creer-seance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './creer-seance.component.html',
})
export class CreerSeanceComponent {
  form: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  readonly types: { value: string; label: string }[] = [
    { value: 'hebdomadaire', label: 'Hebdomadaire' },
    { value: 'mensuelle',    label: 'Mensuelle'    },
    { value: 'autre',        label: 'Autre'        },
  ];

  constructor(
    private fb: FormBuilder,
    private seancesService: SeancesService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      date_seance: ['', Validators.required],
      type:        ['', Validators.required],
      theme:       [''],
      heure:       [''],
      lieu:        [''],
    });
  }

  get date_seance() { return this.form.get('date_seance')!; }
  get type()        { return this.form.get('type')!; }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const raw = this.form.value as Record<string, string>;
    const payload = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== ''),
    ) as unknown as Parameters<SeancesService['createSeance']>[0];

    this.seancesService.createSeance(payload).subscribe({
      next: () => this.router.navigate(['/seances']),
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur serveur. Veuillez réessayer.';
        this.isSubmitting = false;
      },
    });
  }

  annuler(): void {
    this.router.navigate(['/seances']);
  }
}

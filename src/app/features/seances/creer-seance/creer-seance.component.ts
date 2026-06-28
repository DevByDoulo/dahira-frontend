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

  readonly types = [
    { value: 'dahira',    label: 'Dahira',     icon: 'menu_book' },
    { value: 'mensuelle', label: 'Mensuelle',  icon: 'calendar_month' },
    { value: 'autre',     label: 'Autre',      icon: 'groups_3' },
  ];

  constructor(
    private fb: FormBuilder,
    private seancesService: SeancesService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      theme:       ['', Validators.required],
      type:        ['dahira', Validators.required],
      precision:   [''],
      date_seance: ['', Validators.required],
      heure:       [''],
      lieu:        [''],
    });
  }

  get theme()        { return this.form.get('theme')!; }
  get type()         { return this.form.get('type')!; }
  get date_seance()  { return this.form.get('date_seance')!; }
  get precision()    { return this.form.get('precision')!; }
  get isAutre(): boolean { return this.type.value === 'autre'; }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const raw = this.form.value as Record<string, string>;

    if (raw['type'] === 'autre' && raw['precision']) {
      raw['theme'] = `${raw['theme']} — ${raw['precision']}`;
    }
    delete raw['precision'];

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

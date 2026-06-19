import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SeancesService, Seance, CreateSeancePayload } from '../../../core/services/seances.service';

@Component({
  selector: 'app-modifier-seance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './modifier-seance.component.html',
})
export class ModifierSeanceComponent implements OnInit {
  form: FormGroup;
  seanceId!: number;
  seance: Seance | null = null;

  isLoading = true;
  isSubmitting = false;
  errorMessage = '';

  readonly types = [
    { value: 'hebdomadaire', label: 'Dahira',    icon: 'menu_book' },
    { value: 'mensuelle',    label: 'Mensuelle', icon: 'calendar_month' },
    { value: 'autre',        label: 'Autre',     icon: 'groups_3' },
  ];

  constructor(
    private fb: FormBuilder,
    private seancesService: SeancesService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.form = this.fb.group({
      theme:       ['', Validators.required],
      type:        ['hebdomadaire', Validators.required],
      precision:   [''],
      date_seance: ['', Validators.required],
      heure:       [''],
      lieu:        [''],
    });
  }

  get type()       { return this.form.get('type')!; }
  get theme()      { return this.form.get('theme')!; }
  get date_seance(){ return this.form.get('date_seance')!; }
  get isAutre(): boolean { return this.type.value === 'autre'; }

  ngOnInit(): void {
    this.seanceId = Number(this.route.snapshot.paramMap.get('id'));
    this.seancesService.getSeance(this.seanceId).subscribe({
      next: (res) => {
        if (!res.success) { this.router.navigate(['/seances']); return; }
        this.seance = res.data;

        // Séparer le thème composé (theme — precision) si type=autre
        let theme = res.data.theme ?? '';
        let precision = '';
        if (res.data.type === 'autre' && theme.includes(' — ')) {
          const parts = theme.split(' — ');
          theme     = parts[0];
          precision = parts.slice(1).join(' — ');
        }

        this.form.patchValue({
          theme:       theme,
          type:        res.data.type,
          precision:   precision,
          date_seance: res.data.date_seance?.slice(0, 10) ?? '',
          heure:       res.data.heure ?? '',
          lieu:        res.data.lieu  ?? '',
        });
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger la séance.';
        this.isLoading = false;
      },
    });
  }

  setType(value: string): void {
    this.form.patchValue({ type: value });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.isSubmitting = true;
    this.errorMessage = '';

    const v = this.form.value as Record<string, string>;
    let finalTheme = v['theme'].trim();
    if (this.isAutre && v['precision']?.trim()) {
      finalTheme = `${finalTheme} — ${v['precision'].trim()}`;
    }

    const payload: CreateSeancePayload = {
      date_seance: v['date_seance'],
      type:        v['type'] as Seance['type'],
      theme:       finalTheme,
    };
    if (v['heure']) payload.heure = v['heure'];
    if (v['lieu'])  payload.lieu  = v['lieu'];

    this.seancesService.updateSeance(this.seanceId, payload).subscribe({
      next: () => this.router.navigate(['/seances']),
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Erreur serveur. Veuillez réessayer.';
        this.isSubmitting = false;
      },
    });
  }

  annuler(): void {
    this.router.navigate(['/seances']);
  }
}

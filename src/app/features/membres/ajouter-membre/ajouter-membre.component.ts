import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MembresService } from '../../../core/services/membres.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-ajouter-membre',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ajouter-membre.component.html',
})
export class AjouterMembreComponent {
  form: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  phoneErrorMessage = '';

  readonly roles = [
    { value: 'membre',          label: 'Membre' },
    { value: 'responsable_org', label: 'Resp. Org.' },
    { value: 'tresorier',       label: 'Trésorier' },
    { value: 'bureau',          label: 'Administrateur' },
  ];

  readonly sexes = [
    { value: 'M', label: 'Homme' },
    { value: 'F', label: 'Femme' },
  ];

  private readonly apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private membresService: MembresService,
    private http: HttpClient,
    private router: Router,
  ) {
    this.form = this.fb.group({
      nom:           ['', [Validators.required, Validators.minLength(2)]],
      prenom:        [''],
      email:         ['', [Validators.required, Validators.email]],
      telephone:     [''],
      adresse:       [''],
      sexe:          [''],
      role:          ['membre', Validators.required],
      date_adhesion: [''],
    });
  }

  get nom()   { return this.form.get('nom')!; }
  get email() { return this.form.get('email')!; }

  onPhoneInput(event: Event): void {
    this.phoneErrorMessage = '';
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 9);

    let formatted = digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
    if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);

    this.form.get('telephone')!.setValue(formatted, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.phoneErrorMessage = '';

    const raw = { ...this.form.value };
    const email = (raw['email'] as string)?.trim();
    const role  = raw['role'] ?? 'membre';

    delete raw['email'];
    delete raw['role'];

    if (raw['telephone']) raw['telephone'] = (raw['telephone'] as string).replace(/\s/g, '');

    const body = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== '' && v !== null),
    ) as unknown as Parameters<MembresService['createMembre']>[0];

    this.membresService.createMembre(body).subscribe({
      next: (res) => {
        const membreId = res.data.id;

        this.http.post(`${this.apiUrl}/invitations`, { membre_id: membreId, email, role }).subscribe({
          next: () =>
            this.router.navigate(['/membres'], { state: { toast: 'Membre créé et invitation envoyée.' } }),
          error: () =>
            this.router.navigate(['/membres'], {
              state: { toast: 'Membre créé. Invitation non envoyée (vérifiez la config email).' },
            }),
        });
      },
      error: (err) => {
        const message: string = err?.error?.message ?? '';
        const isPhoneDuplicate =
          err?.status === 409 ||
          (err?.status === 400 && /t[eé]l[eé]phone|duplic|ER_DUP/i.test(message));

        if (isPhoneDuplicate) {
          this.phoneErrorMessage = 'Ce numéro est déjà utilisé par un autre membre.';
        } else {
          this.errorMessage = message || 'Erreur serveur. Veuillez réessayer.';
        }
        this.isSubmitting = false;
      },
    });
  }

  annuler(): void {
    this.router.navigate(['/membres']);
  }
}

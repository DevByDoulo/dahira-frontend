import { Component, OnDestroy } from '@angular/core';
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
export class AjouterMembreComponent implements OnDestroy {
  form: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  phoneErrorMessage = '';

  readonly roles = [
    { value: 'membre',    label: 'Membre' },
    { value: 'tresorier', label: 'Trésorier' },
    { value: 'bureau',    label: 'Bureau (Admin)' },
  ];

  private readonly apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private membresService: MembresService,
    private http: HttpClient,
    private router: Router,
  ) {
    this.form = this.fb.group({
      nom_complet:    ['', [Validators.required, Validators.minLength(2)]],
      email:          ['', [Validators.required, Validators.email]],
      role:           ['membre', Validators.required],
      telephone:      [''],
      date_adhesion:  [''],
      responsabilites:[''],
    });
  }

  get nom_complet() { return this.form.get('nom_complet')!; }
  get email()       { return this.form.get('email')!; }
  get telephone()   { return this.form.get('telephone')!; }

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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.phoneErrorMessage = '';

    const raw = this.form.value as Record<string, string>;
    const email = raw['email']?.trim();
    const role  = raw['role'] ?? 'membre';

    // Séparer prénom et nom depuis le champ combiné
    const parts = (raw['nom_complet'] ?? '').trim().split(/\s+/);
    raw['prenom'] = parts[0] ?? '';
    raw['nom']    = parts.length > 1 ? parts.slice(1).join(' ') : parts[0] ?? '';
    delete raw['nom_complet'];
    delete raw['email'];
    delete raw['role'];

    if (raw['telephone']) raw['telephone'] = raw['telephone'].replace(/\s/g, '');

    const body = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== ''),
    ) as unknown as Parameters<MembresService['createMembre']>[0];

    this.membresService.createMembre(body).subscribe({
      next: (res) => {
        const membreId = res.data.id;
        this.http.post(`${this.apiUrl}/invitations`, { membre_id: membreId, email, role }).subscribe({
          next: () => this.router.navigate(['/membres'], { state: { toast: 'Membre créé et invitation envoyée.' } }),
          error: () => this.router.navigate(['/membres'], { state: { toast: 'Membre créé. Invitation non envoyée (vérifiez la configuration email).' } }),
        });
      },
      error: (err) => {
        const message: string = err?.error?.message ?? '';
        const isPhoneDuplicate =
          err?.status === 409 ||
          (err?.status === 400 && /t[eé]l[eé]phone|duplic|ER_DUP/i.test(message));

        if (isPhoneDuplicate) {
          this.phoneErrorMessage = 'Ce numéro de téléphone est déjà utilisé par un autre membre.';
          this.errorMessage = '';
        } else {
          this.errorMessage = message || 'Erreur serveur. Veuillez réessayer.';
          this.phoneErrorMessage = '';
        }
        this.isSubmitting = false;
      },
    });
  }

  annuler(): void {
    this.router.navigate(['/membres']);
  }

  ngOnDestroy(): void {}
}

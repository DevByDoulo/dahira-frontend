import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap, of, catchError } from 'rxjs';
import { MembresService } from '../../../core/services/membres.service';

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

  photoFile: File | null = null;
  photoPreviewUrl: string | null = null;
  photoErrorMessage = '';

  constructor(
    private fb: FormBuilder,
    private membresService: MembresService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      telephone: [''],
      telephone_secours: [''],
      date_adhesion: [''],
      responsabilites: [''],
    });
  }

  get nom() { return this.form.get('nom')!; }
  get prenom() { return this.form.get('prenom')!; }
  get telephone() { return this.form.get('telephone')!; }

  onPhoneInput(event: Event, controlName: 'telephone' | 'telephone_secours'): void {
    if (controlName === 'telephone') this.phoneErrorMessage = '';

    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 9);

    let formatted = digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
    if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);

    this.form.get(controlName)!.setValue(formatted, { emitEvent: false });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      this.photoErrorMessage = 'Format non supporté. Utilisez JPG ou PNG.';
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.photoErrorMessage = 'La photo ne doit pas dépasser 5 Mo.';
      input.value = '';
      return;
    }

    this.revokePreview();
    this.photoFile = file;
    this.photoPreviewUrl = URL.createObjectURL(file);
    this.photoErrorMessage = '';
  }

  removePhoto(input: HTMLInputElement): void {
    this.revokePreview();
    this.photoFile = null;
    this.photoPreviewUrl = null;
    input.value = '';
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
    // Stocker les téléphones sans espaces
    if (raw['telephone'])         raw['telephone']         = raw['telephone'].replace(/\s/g, '');
    if (raw['telephone_secours']) raw['telephone_secours'] = raw['telephone_secours'].replace(/\s/g, '');

    const body = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== ''),
    ) as unknown as Parameters<MembresService['createMembre']>[0];

    const photoFile = this.photoFile;

    // Étape 1 : créer le membre, puis étape 2 : upload photo si sélectionnée.
    // La navigation n'a lieu qu'après la fin de l'upload (photo_url doit être en base
    // avant que GET /api/membres soit appelé par la liste).
    this.membresService
      .createMembre(body)
      .pipe(
        switchMap((res) => {
          if (!res.success) throw new Error('Erreur serveur');
          if (photoFile) {
            return this.membresService.uploadPhoto(res.data.id, photoFile).pipe(
              catchError(() => of(null)), // échec photo non bloquant
            );
          }
          return of(null);
        }),
      )
      .subscribe({
        next: () => this.router.navigate(['/membres']),
        error: (err) => {
          const message: string = err?.error?.message ?? '';
          const isPhoneDuplicate =
            err?.status === 409 ||
            err?.status === 400 && /t[eé]l[eé]phone|duplic|ER_DUP/i.test(message);

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

  ngOnDestroy(): void {
    this.revokePreview();
  }

  private revokePreview(): void {
    if (this.photoPreviewUrl) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }
  }
}

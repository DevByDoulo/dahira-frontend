import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MembresService, Membre } from '../../../core/services/membres.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-modifier-membre',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './modifier-membre.component.html',
})
export class ModifierMembreComponent implements OnInit, OnDestroy {
  form: FormGroup;
  membreId!: number;
  membre: Membre | null = null;

  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  phoneErrorMessage = '';

  photoFile: File | null = null;
  photoPreviewUrl: string | null = null;
  existingPhotoUrl: string | null = null;
  photoErrorMessage = '';

  readonly apiBase = environment.apiUrl.replace('/api', '');

  constructor(
    private fb: FormBuilder,
    private membresService: MembresService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.form = this.fb.group({
      nom:               ['', [Validators.required, Validators.minLength(2)]],
      prenom:            ['', [Validators.required, Validators.minLength(2)]],
      telephone:         [''],
      telephone_secours: [''],
      date_adhesion:     [''],
      responsabilites:   [''],
    });
  }

  get nom()    { return this.form.get('nom')!; }
  get prenom() { return this.form.get('prenom')!; }

  ngOnInit(): void {
    this.membreId = Number(this.route.snapshot.paramMap.get('id'));
    this.membresService.getMembre(this.membreId).subscribe({
      next: (res) => {
        if (!res.success) { this.router.navigate(['/membres']); return; }
        this.membre = res.data;
        this.existingPhotoUrl = res.data.photo_url;
        // Pré-remplir le formulaire avec formatage téléphone
        this.form.patchValue({
          nom:               res.data.nom,
          prenom:            res.data.prenom,
          telephone:         this.formatTel(res.data.telephone),
          telephone_secours: this.formatTel(res.data.telephone_secours),
          date_adhesion:     res.data.date_adhesion?.slice(0, 10) ?? '',
          responsabilites:   res.data.responsabilites ?? '',
        });
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les données du membre.';
        this.isLoading = false;
      },
    });
  }

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

  removeNewPhoto(input: HTMLInputElement): void {
    this.revokePreview();
    this.photoFile = null;
    this.photoPreviewUrl = null;
    input.value = '';
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.phoneErrorMessage = '';

    const raw = { ...this.form.value } as Record<string, string>;
    if (raw['telephone'])         raw['telephone']         = raw['telephone'].replace(/\s/g, '');
    if (raw['telephone_secours']) raw['telephone_secours'] = raw['telephone_secours'].replace(/\s/g, '');

    const payload = {
      nom:               raw['nom'],
      prenom:            raw['prenom'],
      telephone:         raw['telephone'] || undefined,
      telephone_secours: raw['telephone_secours'] || undefined,
      date_adhesion:     raw['date_adhesion'] || undefined,
      responsabilites:   raw['responsabilites'] || undefined,
      photo_url:         this.existingPhotoUrl ?? undefined,
    };

    this.membresService.updateMembre(this.membreId, payload).subscribe({
      next: (res) => {
        if (this.photoFile) {
          this.membresService.uploadPhoto(res.data.id, this.photoFile).subscribe({
            next: () => this.router.navigate(['/membres']),
            error: () => this.router.navigate(['/membres']),
          });
        } else {
          this.router.navigate(['/membres']);
        }
      },
      error: (err) => {
        const message: string = err?.error?.message ?? '';
        if (/t[eé]l[eé]phone|duplic|ER_DUP/i.test(message)) {
          this.phoneErrorMessage = 'Ce numéro de téléphone est déjà utilisé.';
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

  ngOnDestroy(): void {
    this.revokePreview();
  }

  private formatTel(tel: string | null): string {
    if (!tel) return '';
    const d = tel.replace(/\D/g, '');
    if (d.length !== 9) return tel;
    return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
  }

  private revokePreview(): void {
    if (this.photoPreviewUrl) URL.revokeObjectURL(this.photoPreviewUrl);
  }
}

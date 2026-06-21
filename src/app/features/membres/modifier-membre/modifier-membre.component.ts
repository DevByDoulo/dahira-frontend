import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MembresService, Membre } from '../../../core/services/membres.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface UserAccount {
  id: number;
  nom: string;
  telephone: string;
  email: string | null;
  role: 'bureau' | 'tresorier' | 'membre';
  actif: boolean;
  membre_id: number | null;
  created_at: string;
}

@Component({
  selector: 'app-modifier-membre',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
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
  readonly apiUrl = environment.apiUrl;

  // Compte utilisateur
  userAccount: UserAccount | null = null;
  isLoadingAccount = false;
  showAccountModal = false;
  accountModalMode: 'creer' | 'modifier' = 'creer';
  isSavingAccount = false;
  accountError = '';
  showToggleConfirm = false;
  isToggling = false;

  // Champs formulaire compte
  accountNom = '';
  accountTelephone = '';
  accountEmail = '';
  accountRole: 'bureau' | 'tresorier' | 'membre' = 'membre';
  accountPassword = '';

  get isBureau(): boolean {
    return this.authService.getUser()?.role === 'bureau';
  }

  constructor(
    private fb: FormBuilder,
    private membresService: MembresService,
    private authService: AuthService,
    private http: HttpClient,
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
        this.form.patchValue({
          nom:               res.data.nom,
          prenom:            res.data.prenom,
          telephone:         this.formatTel(res.data.telephone),
          telephone_secours: this.formatTel(res.data.telephone_secours),
          date_adhesion:     res.data.date_adhesion?.slice(0, 10) ?? '',
          responsabilites:   res.data.responsabilites ?? '',
        });
        this.isLoading = false;
        if (this.isBureau) this.chargerCompte();
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les données du membre.';
        this.isLoading = false;
      },
    });
  }

  chargerCompte(): void {
    this.isLoadingAccount = true;
    this.http.get<{ success: boolean; data: UserAccount | null }>(`${this.apiUrl}/users/by-membre/${this.membreId}`).subscribe({
      next: (res) => { this.userAccount = res.data; this.isLoadingAccount = false; },
      error: () => { this.isLoadingAccount = false; },
    });
  }

  ouvrirCreerCompte(): void {
    this.accountModalMode = 'creer';
    this.accountNom = `${this.membre?.prenom ?? ''} ${this.membre?.nom ?? ''}`.trim();
    this.accountTelephone = this.membre?.telephone ?? '';
    this.accountEmail = '';
    this.accountRole = 'membre';
    this.accountPassword = '';
    this.accountError = '';
    this.showAccountModal = true;
  }

  ouvrirModifierCompte(): void {
    if (!this.userAccount) return;
    this.accountModalMode = 'modifier';
    this.accountNom = this.userAccount.nom;
    this.accountTelephone = this.userAccount.telephone;
    this.accountEmail = this.userAccount.email ?? '';
    this.accountRole = this.userAccount.role;
    this.accountPassword = '';
    this.accountError = '';
    this.showAccountModal = true;
  }

  fermerAccountModal(): void {
    this.showAccountModal = false;
    this.accountError = '';
  }

  sauvegarderCompte(): void {
    if (!this.accountNom.trim()) { this.accountError = 'Le nom est requis.'; return; }
    if (this.accountModalMode === 'creer' && !this.accountTelephone.trim()) { this.accountError = 'Le téléphone est requis.'; return; }
    if (this.accountModalMode === 'creer' && !this.accountPassword.trim()) { this.accountError = 'Le mot de passe est requis.'; return; }

    this.isSavingAccount = true;
    this.accountError = '';

    if (this.accountModalMode === 'creer') {
      const body = { nom: this.accountNom.trim(), telephone: this.accountTelephone.trim(), email: this.accountEmail || null, role: this.accountRole, password: this.accountPassword, membre_id: this.membreId };
      this.http.post<{ success: boolean; data: UserAccount }>(`${this.apiUrl}/users`, body).subscribe({
        next: (res) => { if (res.success) { this.userAccount = res.data; this.fermerAccountModal(); } this.isSavingAccount = false; },
        error: (err) => { this.accountError = err?.error?.message ?? 'Erreur lors de la création.'; this.isSavingAccount = false; },
      });
    } else if (this.userAccount) {
      const body = { nom: this.accountNom.trim(), email: this.accountEmail || null, role: this.accountRole, membre_id: this.membreId };
      this.http.put<{ success: boolean; data: UserAccount }>(`${this.apiUrl}/users/${this.userAccount.id}`, body).subscribe({
        next: (res) => { if (res.success) { this.userAccount = res.data; this.fermerAccountModal(); } this.isSavingAccount = false; },
        error: (err) => { this.accountError = err?.error?.message ?? 'Erreur lors de la modification.'; this.isSavingAccount = false; },
      });
    }
  }

  demanderToggle(): void { this.showToggleConfirm = true; }
  annulerToggle(): void { this.showToggleConfirm = false; }

  confirmerToggle(): void {
    if (!this.userAccount) return;
    this.isToggling = true;
    const endpoint = this.userAccount.actif ? 'desactiver' : 'activer';
    this.http.patch<{ success: boolean; data: UserAccount }>(`${this.apiUrl}/users/${this.userAccount.id}/${endpoint}`, {}).subscribe({
      next: (res) => { if (res.success) this.userAccount = res.data; this.isToggling = false; this.showToggleConfirm = false; },
      error: () => { this.isToggling = false; this.showToggleConfirm = false; },
    });
  }

  roleBadge(role: string): string {
    switch (role) {
      case 'bureau': return 'bg-primary text-on-primary';
      case 'tresorier': return 'bg-secondary-container text-on-secondary-container';
      default: return 'bg-surface-container text-on-surface-variant';
    }
  }

  roleLabel(role: string): string {
    switch (role) {
      case 'bureau': return 'Administrateur';
      case 'tresorier': return 'Trésorier';
      default: return 'Membre';
    }
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

  annuler(): void { this.router.navigate(['/membres']); }

  ngOnDestroy(): void { this.revokePreview(); }

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

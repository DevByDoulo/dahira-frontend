import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MembresService, Membre } from '../../../core/services/membres.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-modifier-membre',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './modifier-membre.component.html',
})
export class ModifierMembreComponent implements OnInit {
  form: FormGroup;
  membreId!: number;
  membre: Membre | null = null;

  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  phoneErrorMessage = '';

  // Changement de rôle
  showRoleModal = false;
  selectedRole: 'bureau' | 'tresorier' | 'responsable_org' | 'membre' = 'membre';
  isSavingRole = false;
  roleError = '';

  // Activation / désactivation
  showToggleConfirm = false;
  isToggling = false;

  get isBureau(): boolean {
    return this.authService.getUser()?.role === 'bureau';
  }

  constructor(
    private fb: FormBuilder,
    private membresService: MembresService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.form = this.fb.group({
      nom_complet:     ['', [Validators.required, Validators.minLength(2)]],
      telephone:       [''],
      date_adhesion:   [''],
      responsabilites: [''],
    });
  }

  get nom_complet() { return this.form.get('nom_complet')!; }

  ngOnInit(): void {
    this.membreId = Number(this.route.snapshot.paramMap.get('id'));
    this.membresService.getMembre(this.membreId).subscribe({
      next: (res) => {
        if (!res.success) { this.router.navigate(['/membres']); return; }
        this.membre = res.data;
        this.form.patchValue({
          nom_complet:     `${res.data.prenom ?? ''} ${res.data.nom ?? ''}`.trim(),
          telephone:       this.formatTel(res.data.telephone),
          date_adhesion:   res.data.date_adhesion?.slice(0, 10) ?? '',
          responsabilites: res.data.responsabilites ?? '',
        });
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les données du membre.';
        this.isLoading = false;
      },
    });
  }

  // --- Rôle ---

  ouvrirRoleModal(): void {
    this.selectedRole = this.membre?.role ?? 'membre';
    this.roleError = '';
    this.showRoleModal = true;
  }

  fermerRoleModal(): void {
    this.showRoleModal = false;
    this.roleError = '';
  }

  sauvegarderRole(): void {
    this.isSavingRole = true;
    this.roleError = '';
    this.membresService.updateRole(this.membreId, this.selectedRole).subscribe({
      next: (res) => {
        if (res.success && this.membre) {
          this.membre = { ...this.membre, role: res.data.role };
        }
        this.fermerRoleModal();
        this.isSavingRole = false;
      },
      error: (err) => {
        this.roleError = err?.error?.message ?? 'Erreur lors de la mise à jour du rôle.';
        this.isSavingRole = false;
      },
    });
  }

  // --- Activation ---

  demanderToggle(): void { this.showToggleConfirm = true; }
  annulerToggle(): void { this.showToggleConfirm = false; }

  confirmerToggle(): void {
    if (!this.membre) return;
    this.isToggling = true;
    const action$ = this.membre.actif
      ? this.membresService.desactiverMembre(this.membreId)
      : this.membresService.activerMembre(this.membreId);

    action$.subscribe({
      next: (res) => {
        if (res.success) this.membre = res.data;
        this.isToggling = false;
        this.showToggleConfirm = false;
      },
      error: () => {
        this.isToggling = false;
        this.showToggleConfirm = false;
      },
    });
  }

  // --- Badges ---

  roleBadge(role: string): string {
    switch (role) {
      case 'bureau': return 'bg-primary text-on-primary';
      case 'tresorier': return 'bg-secondary-container text-on-secondary-container';
      case 'responsable_org': return 'bg-tertiary-container text-on-tertiary-container';
      default: return 'bg-surface-container text-on-surface-variant';
    }
  }

  roleLabel(role: string): string {
    switch (role) {
      case 'bureau': return 'Administrateur';
      case 'tresorier': return 'Trésorier';
      case 'responsable_org': return 'Communicateur';
      default: return 'Membre';
    }
  }

  // --- Formulaire info ---

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

    const raw = { ...this.form.value } as Record<string, string>;
    const parts = (raw['nom_complet'] ?? '').trim().split(/\s+/);
    const prenom = parts[0] ?? '';
    const nom    = parts.length > 1 ? parts.slice(1).join(' ') : prenom;
    if (raw['telephone']) raw['telephone'] = raw['telephone'].replace(/\s/g, '');

    const payload = {
      nom,
      prenom,
      telephone:       raw['telephone'] || undefined,
      date_adhesion:   raw['date_adhesion'] || undefined,
      responsabilites: raw['responsabilites'] || undefined,
    };
    this.membresService.updateMembre(this.membreId, payload).subscribe({
      next: () => this.router.navigate(['/membres']),
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

  private formatTel(tel: string | null | undefined): string {
    if (!tel) return '';
    const d = tel.replace(/\D/g, '');
    if (d.length !== 9) return tel;
    return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
  }
}

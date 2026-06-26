import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface User {
  id: number;
  nom: string;
  telephone: string;
  email: string | null;
  role: 'bureau' | 'tresorier' | 'membre';
  actif: boolean;
  membre_id: number | null;
  created_at: string;
}

type ModalMode = 'creer' | 'modifier';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  readonly apiUrl = environment.apiUrl;

  users: User[] = [];
  isLoading = true;
  errorMessage = '';

  // Modal
  showModal = false;
  modalMode: ModalMode = 'creer';
  selectedUser: User | null = null;
  isSaving = false;
  modalError = '';

  // Formulaire modal
  formNom = '';
  formTelephone = '';
  formEmail = '';
  formRole: 'bureau' | 'tresorier' | 'membre' = 'membre';
  formPassword = '';

  // Confirmation désactivation
  showConfirmModal = false;
  confirmUser: User | null = null;
  isToggling = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.chargerUsers();
  }

  chargerUsers(): void {
    this.isLoading = true;
    this.http.get<{ success: boolean; data: User[] }>(`${this.apiUrl}/users`).subscribe({
      next: (res) => {
        if (res.success) this.users = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les utilisateurs.';
        this.isLoading = false;
      },
    });
  }

  get totalActifs(): number { return this.users.filter(u => u.actif).length; }
  get totalBureau(): number { return this.users.filter(u => u.role === 'bureau').length; }
  get totalMembres(): number { return this.users.filter(u => u.role === 'membre').length; }

  ouvrirCreer(): void {
    this.modalMode = 'creer';
    this.selectedUser = null;
    this.formNom = '';
    this.formTelephone = '';
    this.formEmail = '';
    this.formRole = 'membre';
    this.formPassword = '';
    this.modalError = '';
    this.showModal = true;
  }

  ouvrirModifier(user: User): void {
    this.modalMode = 'modifier';
    this.selectedUser = user;
    this.formNom = user.nom;
    this.formTelephone = user.telephone;
    this.formEmail = user.email ?? '';
    this.formRole = user.role;
    this.formPassword = '';
    this.modalError = '';
    this.showModal = true;
  }

  fermerModal(): void {
    this.showModal = false;
    this.selectedUser = null;
    this.modalError = '';
  }

  sauvegarder(): void {
    if (!this.formNom.trim()) { this.modalError = 'Le nom est requis.'; return; }
    if (this.modalMode === 'creer' && !this.formTelephone.trim()) { this.modalError = 'Le téléphone est requis.'; return; }
    if (this.modalMode === 'creer' && !this.formPassword.trim()) { this.modalError = 'Le mot de passe est requis.'; return; }

    this.isSaving = true;
    this.modalError = '';

    if (this.modalMode === 'creer') {
      const body = { nom: this.formNom.trim(), telephone: this.formTelephone.trim(), email: this.formEmail || null, role: this.formRole, password: this.formPassword };
      this.http.post<{ success: boolean; data: User }>(`${this.apiUrl}/users`, body).subscribe({
        next: (res) => {
          if (res.success) { this.users = [res.data, ...this.users]; this.fermerModal(); }
          this.isSaving = false;
        },
        error: (err) => { this.modalError = err?.error?.message ?? 'Erreur lors de la création.'; this.isSaving = false; },
      });
    } else if (this.selectedUser) {
      const body = { nom: this.formNom.trim(), email: this.formEmail || null, role: this.formRole, membre_id: this.selectedUser.membre_id };
      this.http.put<{ success: boolean; data: User }>(`${this.apiUrl}/users/${this.selectedUser.id}`, body).subscribe({
        next: (res) => {
          if (res.success) { this.users = this.users.map(u => u.id === res.data.id ? res.data : u); this.fermerModal(); }
          this.isSaving = false;
        },
        error: (err) => { this.modalError = err?.error?.message ?? 'Erreur lors de la modification.'; this.isSaving = false; },
      });
    }
  }

  demanderToggle(user: User): void {
    this.confirmUser = user;
    this.showConfirmModal = true;
  }

  confirmerToggle(): void {
    if (!this.confirmUser) return;
    this.isToggling = true;
    const user = this.confirmUser;
    const endpoint = user.actif ? 'desactiver' : 'activer';

    this.http.patch<{ success: boolean; data: User }>(`${this.apiUrl}/users/${user.id}/${endpoint}`, {}).subscribe({
      next: (res) => {
        if (res.success) this.users = this.users.map(u => u.id === res.data.id ? res.data : u);
        this.isToggling = false;
        this.showConfirmModal = false;
        this.confirmUser = null;
      },
      error: () => { this.isToggling = false; this.showConfirmModal = false; },
    });
  }

  annulerToggle(): void {
    this.showConfirmModal = false;
    this.confirmUser = null;
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

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  initiales(nom: string): string {
    return nom.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}

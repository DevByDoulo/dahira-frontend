import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { MembresService, Membre } from '../../core/services/membres.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-invitation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invitation.component.html',
})
export class InvitationComponent implements OnInit {
  readonly apiUrl = environment.apiUrl;

  // Membres
  membres: Membre[] = [];
  membresFiltes: Membre[] = [];
  recherche = '';
  showDropdown = false;
  selectedMembre: Membre | null = null;
  isLoadingMembres = true;

  // Formulaire
  email = '';
  role: 'membre' | 'responsable_org' | 'tresorier' | 'bureau' = 'membre';

  // États
  isSending = false;
  sent = false;
  formError = '';
  sentEmail = '';

  constructor(
    private membresService: MembresService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.membresService.getMembres().subscribe({
      next: (res) => {
        if (res.success) {
          this.membres = res.data.filter(m => m.actif);
          this.membresFiltes = this.membres;
        }
        this.isLoadingMembres = false;
      },
      error: () => { this.isLoadingMembres = false; },
    });
  }

  filtrerMembres(): void {
    const q = this.recherche.toLowerCase().trim();
    this.membresFiltes = q
      ? this.membres.filter(m =>
          `${m.prenom} ${m.nom}`.toLowerCase().includes(q) ||
          `${m.nom} ${m.prenom}`.toLowerCase().includes(q)
        )
      : this.membres;
    this.showDropdown = true;
    this.selectedMembre = null;
  }

  selectionnerMembre(m: Membre): void {
    this.selectedMembre = m;
    this.recherche = `${m.prenom} ${m.nom}`;
    this.showDropdown = false;
    if (!this.email) this.email = '';
  }

  fermerDropdown(): void {
    setTimeout(() => { this.showDropdown = false; }, 150);
  }

  envoyerInvitation(): void {
    this.formError = '';

    if (!this.selectedMembre) { this.formError = 'Veuillez sélectionner un membre.'; return; }
    if (!this.email.trim()) { this.formError = 'L\'adresse email est requise.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) { this.formError = 'Adresse email invalide.'; return; }

    this.isSending = true;

    this.http.post<{ success: boolean; data: object }>(
      `${this.apiUrl}/invitations`,
      { membre_id: this.selectedMembre.id, email: this.email.trim(), role: this.role }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.sentEmail = this.email.trim();
          this.sent = true;
        }
        this.isSending = false;
      },
      error: (err) => {
        this.formError = err?.error?.message ?? 'Erreur lors de l\'envoi de l\'invitation.';
        this.isSending = false;
      },
    });
  }

  nouvelleInvitation(): void {
    this.sent = false;
    this.selectedMembre = null;
    this.recherche = '';
    this.email = '';
    this.role = 'membre' as 'membre' | 'responsable_org' | 'tresorier' | 'bureau';
    this.formError = '';
    this.sentEmail = '';
  }

  get nomMembre(): string {
    return this.selectedMembre
      ? `${this.selectedMembre.prenom} ${this.selectedMembre.nom}`
      : '';
  }
}

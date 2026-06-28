import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EvenementsService, Evenement } from '../../core/services/evenements.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-evenements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './evenements.component.html',
})
export class EvenementsComponent implements OnInit, OnDestroy {
  isLoading = true;
  errorMessage = '';
  evenements: Evenement[] = [];
  statutActif: 'a_venir' | 'passe' | '' = 'a_venir';
  searchQuery = '';

  page = 1;
  readonly pageSize = 6;

  modalSupprimer: Evenement | null = null;
  isActionLoading = false;
  isBureau = false;

  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly onglets = [
    { value: 'a_venir', label: 'À venir' },
    { value: 'passe', label: 'Passés' },
    { value: '', label: 'Tous' },
  ];

  constructor(
    private evenementsService: EvenementsService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const toastMsg = nav?.extras?.state?.['toast'] as string | undefined;
    if (toastMsg) this.showToast(toastMsg, 'success');
    this.isBureau = this.authService.getUser()?.role === 'bureau';
    this.charger();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  charger(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.evenementsService.getEvenements().subscribe({
      next: (res) => {
        this.evenements = res.success ? res.data : [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les événements.';
        this.isLoading = false;
      },
    });
  }

  statutCalcule(e: Evenement): 'a_venir' | 'passe' {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(e.date_debut) >= today ? 'a_venir' : 'passe';
  }

  get filtres(): Evenement[] {
    let result = this.evenements;
    if (this.statutActif) result = result.filter((e) => this.statutCalcule(e) === this.statutActif);
    const q = this.searchQuery.trim().toLowerCase();
    if (q) result = result.filter((e) => e.titre.toLowerCase().includes(q));
    return result;
  }

  get paginated(): Evenement[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtres.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(Math.ceil(this.filtres.length / this.pageSize), 1);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get rangeLabel(): string {
    const total = this.filtres.length;
    if (total === 0) return 'Aucun événement';
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, total);
    return `${start}–${end} sur ${total} événement${total > 1 ? 's' : ''}`;
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.page = p;
  }

  setOnglet(val: string): void {
    this.statutActif = val as 'a_venir' | 'passe' | '';
    this.page = 1;
  }

  onSearch(): void {
    this.page = 1;
  }

  get totalEvenements(): number {
    return this.evenements.length;
  }

  get evenementsAVenir(): number {
    return this.evenements.filter((e) => this.statutCalcule(e) === 'a_venir').length;
  }

  get evenementsPasses(): number {
    return this.evenements.filter((e) => this.statutCalcule(e) === 'passe').length;
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  statutLabel(e: Evenement): string {
    return this.statutCalcule(e) === 'a_venir' ? 'À venir' : 'Passé';
  }

  ouvrirSupprimer(e: Evenement): void {
    this.modalSupprimer = e;
  }

  fermerModal(): void {
    this.modalSupprimer = null;
    this.isActionLoading = false;
  }

  execSupprimer(): void {
    if (!this.modalSupprimer) return;
    this.isActionLoading = true;
    this.evenementsService.deleteEvenement(this.modalSupprimer.id).subscribe({
      next: () => {
        this.fermerModal();
        this.showToast('Événement supprimé.', 'success');
        this.charger();
      },
      error: () => {
        this.showToast('Erreur lors de la suppression.', 'error');
        this.isActionLoading = false;
      },
    });
  }

  photoUrl(ev: Evenement): string {
    if (!ev.image_url) return '';
    if (ev.image_url.startsWith('http')) return ev.image_url;
    return `${environment.backendUrl}${ev.image_url}`;
  }

  showToast(message: string, type: 'success' | 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => (this.toast = null), 3500);
  }
}

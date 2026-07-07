import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CotisationsService, Cotisation } from '../../core/services/cotisations.service';
import { SkeletonTableComponent } from '../../shared/components/skeleton-table/skeleton-table.component';

type ActiveTab = 'toutes' | 'en_attente';

@Component({
  selector: 'app-cotisations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkeletonTableComponent],
  templateUrl: './cotisations.component.html',
})
export class CotisationsComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  cotisations: Cotisation[] = [];

  activeTab: ActiveTab = 'toutes';
  searchQuery = '';
  statutFilter = '';
  modePaiementFilter = '';
  periodeFilter = '';

  page = 1;
  readonly pageSize = 10;

  // Modal validation
  modalVisible = false;
  modalCotisation: Cotisation | null = null;
  isSubmitting = false;
  modalError = '';

  // Modal détail
  detailVisible = false;
  detailCotisation: Cotisation | null = null;

  // Modal rejet
  rejetVisible = false;
  rejetCotisation: Cotisation | null = null;
  rejetNote = '';
  isRejecting = false;
  rejetError = '';

  // Menu contextuel (⋮)
  menuOpenId: number | null = null;
  filterPanelOpen = false;

  isExporting = false;
  isRelancing = false;
  modalRelanceVisible = false;

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private cotisationsService: CotisationsService) {}

  ngOnInit(): void {
    this.charger();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.menuOpenId = null;
    this.filterPanelOpen = false;
  }

  toggleFilterPanel(event: Event): void {
    event.stopPropagation();
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  charger(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cotisationsService.getCotisations().subscribe({
      next: (res) => {
        this.cotisations = res.success ? res.data : [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les cotisations.';
        this.isLoading = false;
      },
    });
  }

  // ── Filtrage / pagination ───────────────────────────────────────────────────

  get filtrees(): Cotisation[] {
    let result = this.cotisations;
    if (this.activeTab === 'en_attente') result = result.filter((c) => c.statut === 'pending');
    if (this.statutFilter) result = result.filter((c) => c.statut === this.statutFilter);
    if (this.modePaiementFilter) result = result.filter((c) => c.mode_paiement === this.modePaiementFilter);
    if (this.periodeFilter) result = result.filter((c) => (c.date_seance ?? c.created_at ?? '').startsWith(this.periodeFilter));
    const q = this.searchQuery.trim().toLowerCase();
    if (q) result = result.filter((c) => `${c.prenom ?? ''} ${c.nom ?? ''}`.toLowerCase().includes(q));
    return result;
  }

  get hasActiveFilters(): boolean {
    return !!(this.statutFilter || this.modePaiementFilter || this.periodeFilter || this.searchQuery);
  }

  get activeFiltersCount(): number {
    return [this.statutFilter, this.modePaiementFilter, this.periodeFilter, this.searchQuery].filter(Boolean).length;
  }

  clearFilters(): void {
    this.statutFilter = '';
    this.modePaiementFilter = '';
    this.periodeFilter = '';
    this.searchQuery = '';
    this.page = 1;
  }

  get paginated(): Cotisation[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtrees.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtrees.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get rangeLabel(): string {
    const total = this.filtrees.length;
    if (total === 0) return 'Aucune cotisation';
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, total);
    return `Affichage de ${start}–${end} sur ${total} cotisation${total > 1 ? 's' : ''}`;
  }

  setTab(tab: ActiveTab): void { this.activeTab = tab; this.page = 1; }
  onFilterChange(): void { this.page = 1; }
  setPage(p: number): void { if (p >= 1 && p <= this.totalPages) this.page = p; }

  // ── Menu contextuel ─────────────────────────────────────────────────────────

  toggleMenu(event: Event, id: number): void {
    event.stopPropagation();
    this.menuOpenId = this.menuOpenId === id ? null : id;
  }

  // ── Modal validation ────────────────────────────────────────────────────────

  openModal(cotisation: Cotisation): void {
    this.menuOpenId = null;
    this.modalCotisation = cotisation;
    this.modalError = '';
    this.modalVisible = true;
  }

  closeModal(): void {
    if (this.isSubmitting) return;
    this.modalVisible = false;
    this.modalCotisation = null;
  }

  confirmerValidation(): void {
    if (!this.modalCotisation) return;
    this.isSubmitting = true;
    this.modalError = '';
    const id = this.modalCotisation.id;
    this.cotisationsService.validerCotisation(id).subscribe({
      next: () => {
        const idx = this.cotisations.findIndex((c) => c.id === id);
        if (idx !== -1) this.cotisations.splice(idx, 1);
        this.isSubmitting = false;
        this.closeModal();
        this.showToast('Cotisation validée avec succès.', 'success');
      },
      error: (err) => {
        this.modalError = err?.error?.message || 'Erreur lors de la validation.';
        this.isSubmitting = false;
      },
    });
  }

  // ── Modal détail ────────────────────────────────────────────────────────────

  openDetail(cotisation: Cotisation): void {
    this.menuOpenId = null;
    this.detailCotisation = cotisation;
    this.detailVisible = true;
  }

  closeDetail(): void {
    this.detailVisible = false;
    this.detailCotisation = null;
  }

  // ── Modal rejet ──────────────────────────────────────────────────────────────

  openRejet(cotisation: Cotisation): void {
    this.menuOpenId = null;
    this.detailVisible = false;
    this.rejetCotisation = cotisation;
    this.rejetNote = '';
    this.rejetError = '';
    this.rejetVisible = true;
  }

  closeRejet(): void {
    if (this.isRejecting) return;
    this.rejetVisible = false;
    this.rejetCotisation = null;
  }

  confirmerRejet(): void {
    if (!this.rejetCotisation) return;
    this.isRejecting = true;
    this.rejetError = '';
    const id = this.rejetCotisation.id;
    this.cotisationsService.rejeterCotisation(id, this.rejetNote.trim() || undefined).subscribe({
      next: () => {
        const idx = this.cotisations.findIndex((c) => c.id === id);
        if (idx !== -1) this.cotisations.splice(idx, 1);
        this.isRejecting = false;
        this.closeRejet();
        this.showToast('Cotisation rejetée.', 'error');
      },
      error: (err) => {
        this.rejetError = err?.error?.message || 'Erreur lors du rejet.';
        this.isRejecting = false;
      },
    });
  }

  // ── Relances ────────────────────────────────────────────────────────────────

  ouvrirModalRelance(): void { this.modalRelanceVisible = true; }
  fermerModalRelance(): void { this.modalRelanceVisible = false; }

  confirmerRelance(): void {
    if (this.isRelancing) return;
    this.isRelancing = true;
    this.cotisationsService.relancer(3).subscribe({
      next: (res) => {
        this.isRelancing = false;
        this.modalRelanceVisible = false;
        const { envoyes, sansEmail, total } = res.data;
        if (total === 0) {
          this.showToast('Aucune cotisation en attente depuis plus de 3 jours.', 'success');
        } else if (envoyes === 0) {
          this.showToast(`${total} membre(s) concerné(s) mais aucun email renseigné.`, 'error');
        } else {
          this.showToast(
            `${envoyes} email${envoyes > 1 ? 's' : ''} envoyé${envoyes > 1 ? 's' : ''}` +
            (sansEmail > 0 ? ` · ${sansEmail} sans email` : ''),
            'success',
          );
        }
      },
      error: () => {
        this.isRelancing = false;
        this.showToast('Erreur lors de l\'envoi des relances.', 'error');
      },
    });
  }

  // ── Export PDF ──────────────────────────────────────────────────────────────

  exporterPdf(): void {
    if (this.isExporting) return;
    this.isExporting = true;
    const statut = this.activeTab === 'en_attente' ? 'pending' : (this.statutFilter || undefined);
    try {
      this.cotisationsService.exportPdf(statut);
    } finally {
      setTimeout(() => (this.isExporting = false), 2000);
    }
  }

  // ── Toast ───────────────────────────────────────────────────────────────────

  showToast(message: string, type: 'success' | 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => (this.toast = null), 3500);
  }

  // ── KPI ─────────────────────────────────────────────────────────────────────

  get totalCollecte(): number {
    return this.cotisations
      .filter((c) => c.statut === 'approved')
      .reduce((sum, c) => sum + Number(c.montant), 0);
  }

  get nombreEnAttente(): number {
    return this.cotisations.filter((c) => c.statut === 'pending').length;
  }

  get totalMois(): number {
    const now = new Date();
    return this.cotisations
      .filter((c) => {
        if (c.statut !== 'approved') return false;
        const d = new Date(c.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, c) => sum + Number(c.montant), 0);
  }

  // ── Helpers d'affichage ─────────────────────────────────────────────────────

  formatMontant(montant: number | string): string {
    const n = Math.round(Number(montant));
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  }

  formatDate(date: string | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDatetime(date: string | null | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  modeLabel(mode: string): string {
    const map: Record<string, string> = { especes: 'Espèces', wave: 'Wave', orange_money: 'Orange Money' };
    return map[mode] ?? mode;
  }

  modeIcon(mode: string): string {
    if (mode === 'especes') return 'payments';
    if (mode === 'wave') return 'smartphone';
    return 'phonelink_ring';
  }

  initiales(c: Cotisation): string {
    return `${(c.prenom ?? '?')[0]}${(c.nom ?? '?')[0]}`.toUpperCase();
  }
}

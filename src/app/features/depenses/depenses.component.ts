import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DepensesService, Depense } from '../../core/services/depenses.service';
import { AuthService } from '../../core/services/auth.service';
import { SkeletonTableComponent } from '../../shared/components/skeleton-table/skeleton-table.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-depenses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkeletonTableComponent],
  templateUrl: './depenses.component.html',
})
export class DepensesComponent implements OnInit, OnDestroy {
  isLoading = true;
  errorMessage = '';
  depenses: Depense[] = [];

  searchQuery = '';
  categorieFilter = '';

  page = 1;
  readonly pageSize = 10;

  menuOpenId: number | null = null;

  modalMode: 'detail' | 'valider' | 'rejeter' | 'supprimer' | null = null;
  depenseSelectionnee: Depense | null = null;
  motifRejet = '';
  isActionLoading = false;

  isBureau = false;

  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly categories: { value: string; label: string }[] = [
    { value: '', label: 'Toutes' },
    { value: 'evenements', label: 'Événements' },
    { value: 'location', label: 'Location' },
    { value: 'nourriture', label: 'Nourriture' },
    { value: 'donations', label: 'Donations' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'autres', label: 'Autres' },
  ];

  constructor(
    private depensesService: DepensesService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const toastMsg = nav?.extras?.state?.['toast'] as string | undefined;
    if (toastMsg) this.showToast(toastMsg, 'success');
    this.isBureau = this.authService.getUser()?.role === 'Bureau';
    this.charger();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.menuOpenId = null;
  }

  charger(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.depensesService.getDepenses({ limit: 500 }).subscribe({
      next: (res) => {
        this.depenses = res.success ? res.data.depenses : [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les dépenses.';
        this.isLoading = false;
      },
    });
  }

  // ── Filtrage / pagination ───────────────────────────────────────────────────

  get filtrees(): Depense[] {
    let result = this.depenses;
    if (this.categorieFilter) result = result.filter((d) => d.categorie === this.categorieFilter);
    const q = this.searchQuery.trim().toLowerCase();
    if (q) result = result.filter((d) => d.description.toLowerCase().includes(q));
    return result;
  }

  get paginated(): Depense[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtrees.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtrees.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [];
    const around = [this.page - 1, this.page, this.page + 1].filter((p) => p >= 1 && p <= total);
    if (!around.includes(1)) pages.push(1);
    pages.push(...around);
    if (!around.includes(total)) pages.push(total);
    return [...new Set(pages)].sort((a, b) => a - b);
  }

  get rangeLabel(): string {
    const total = this.filtrees.length;
    if (total === 0) return 'Aucune dépense';
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, total);
    return `Affichage ${start}–${end} sur ${total} dépense${total > 1 ? 's' : ''}`;
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.page = p;
  }

  onFilterChange(): void {
    this.page = 1;
  }

  // ── KPIs calculés ──────────────────────────────────────────────────────────

  get totalMois(): number {
    const now = new Date();
    return this.depenses
      .filter((d) => {
        if (d.statut === 'rejetee') return false;
        const dt = new Date(d.date_depense);
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
      })
      .reduce((sum, d) => sum + Number(d.montant), 0);
  }

  get totalGeneral(): number {
    return this.depenses
      .filter((d) => d.statut !== 'rejetee')
      .reduce((sum, d) => sum + Number(d.montant), 0);
  }

  get topCategorie(): string {
    if (!this.depenses.length) return '—';
    const totals: Record<string, number> = {};
    for (const d of this.depenses) {
      if (d.statut === 'rejetee') continue;
      totals[d.categorie] = (totals[d.categorie] ?? 0) + Number(d.montant);
    }
    const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    return top ? this.categorieLabel(top[0]) : '—';
  }

  get topCategoriePercent(): number {
    if (!this.depenses.length) return 0;
    const totals: Record<string, number> = {};
    let grand = 0;
    for (const d of this.depenses) {
      if (d.statut === 'rejetee') continue;
      totals[d.categorie] = (totals[d.categorie] ?? 0) + Number(d.montant);
      grand += Number(d.montant);
    }
    if (grand === 0) return 0;
    const topVal = Math.max(...Object.values(totals));
    return Math.round((topVal / grand) * 100);
  }

  get nombreEnAttente(): number {
    return this.depenses.filter((d) => d.statut === 'en_attente').length;
  }

  // ── Helpers d'affichage ─────────────────────────────────────────────────────

  formatMontant(m: number | string): string {
    return Number(m).toLocaleString('fr-SN') + ' FCFA';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  categorieLabel(c: string): string {
    const map: Record<string, string> = {
      evenements: 'Événements',
      location: 'Location',
      nourriture: 'Nourriture',
      donations: 'Donations',
      maintenance: 'Maintenance',
      autres: 'Autres',
    };
    return map[c] ?? c;
  }

  categorieIcon(c: string): string {
    const map: Record<string, string> = {
      evenements: 'calendar_today',
      location: 'location_on',
      nourriture: 'restaurant',
      donations: 'volunteer_activism',
      maintenance: 'home_repair_service',
      autres: 'shopping_bag',
    };
    return map[c] ?? 'receipt_long';
  }

  statutClass(s: string): string {
    if (s === 'validee') return 'bg-green-100 text-green-700';
    if (s === 'rejetee') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  }

  statutLabel(s: string): string {
    if (s === 'validee') return 'Validée';
    if (s === 'rejetee') return 'Rejetée';
    return 'En attente';
  }

  fileUrl(path: string): string {
    return `${environment.backendUrl}${path}`;
  }

  // ── Menu contextuel ─────────────────────────────────────────────────────────

  toggleMenu(event: Event, id: number): void {
    event.stopPropagation();
    this.menuOpenId = this.menuOpenId === id ? null : id;
  }

  // ── Modals ──────────────────────────────────────────────────────────────────

  ouvrirModal(mode: 'detail' | 'valider' | 'rejeter' | 'supprimer', d: Depense): void {
    this.depenseSelectionnee = d;
    this.modalMode = mode;
    this.motifRejet = '';
    this.menuOpenId = null;
  }

  fermerModal(): void {
    this.modalMode = null;
    this.depenseSelectionnee = null;
    this.motifRejet = '';
    this.isActionLoading = false;
  }

  execValider(): void {
    if (!this.depenseSelectionnee) return;
    this.isActionLoading = true;
    this.depensesService.validerDepense(this.depenseSelectionnee.id).subscribe({
      next: () => {
        this.fermerModal();
        this.showToast('Dépense validée avec succès.', 'success');
        this.charger();
      },
      error: (err) => {
        this.showToast(err?.error?.message ?? 'Erreur lors de la validation.', 'error');
        this.isActionLoading = false;
      },
    });
  }

  execRejeter(): void {
    if (!this.depenseSelectionnee || !this.motifRejet.trim()) return;
    this.isActionLoading = true;
    this.depensesService.rejeterDepense(this.depenseSelectionnee.id, this.motifRejet.trim()).subscribe({
      next: () => {
        this.fermerModal();
        this.showToast('Dépense rejetée.', 'success');
        this.charger();
      },
      error: (err) => {
        this.showToast(err?.error?.message ?? 'Erreur lors du rejet.', 'error');
        this.isActionLoading = false;
      },
    });
  }

  execSupprimer(): void {
    if (!this.depenseSelectionnee) return;
    this.isActionLoading = true;
    this.depensesService.deleteDepense(this.depenseSelectionnee.id).subscribe({
      next: () => {
        this.fermerModal();
        this.showToast('Dépense supprimée.', 'success');
        this.charger();
      },
      error: (err) => {
        this.showToast(err?.error?.message ?? 'Erreur lors de la suppression.', 'error');
        this.isActionLoading = false;
      },
    });
  }

  showToast(message: string, type: 'success' | 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => (this.toast = null), 3500);
  }
}

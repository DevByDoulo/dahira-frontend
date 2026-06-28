import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs/operators';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MembresService, Membre } from '../../core/services/membres.service';
import { SkeletonTableComponent } from '../../shared/components/skeleton-table/skeleton-table.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-membres',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkeletonTableComponent],
  templateUrl: './membres.component.html',
})
export class MembresComponent implements OnInit {
  readonly backendUrl = environment.backendUrl;
  isLoading = true;
  errorMessage = '';
  membres: Membre[] = [];
  toastMessage = '';

  searchQuery = '';
  statutFilter = '';
  cotisationFilter = '';

  page = 1;
  readonly pageSize = 10;

  // Modale désactivation
  confirmTarget: Membre | null = null;
  isTogglingActif = false;

  constructor(
    private membresService: MembresService,
    private route: ActivatedRoute,
    readonly router: Router,
  ) {}

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const toast = nav?.extras?.state?.['toast'] as string | undefined;
    if (toast) {
      this.toastMessage = toast;
      setTimeout(() => (this.toastMessage = ''), 4000);
    }

    this.route.queryParams.pipe(take(1)).subscribe((params) => {
      this.searchQuery      = params['q']          ?? '';
      this.statutFilter     = params['statut']     ?? '';
      this.cotisationFilter = params['cotisation'] ?? '';
      this.page             = parseInt(params['page'] ?? '1', 10) || 1;
      this.chargerMembres();
    });
  }

  chargerMembres(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.membresService.getMembres().subscribe({
      next: (res) => {
        if (res.success) this.membres = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les membres. Vérifiez votre connexion.';
        this.isLoading = false;
      },
    });
  }

  demanderToggle(membre: Membre): void {
    this.confirmTarget = membre;
  }

  confirmerToggle(): void {
    if (!this.confirmTarget || this.isTogglingActif) return;
    const target = this.confirmTarget;
    this.isTogglingActif = true;

    this.membresService.desactiverMembre(target.id).subscribe({
      next: (res) => {
        target.actif = res.data.actif;
        this.confirmTarget = null;
        this.isTogglingActif = false;
      },
      error: () => {
        this.confirmTarget = null;
        this.isTogglingActif = false;
      },
    });
  }

  // ── Filtrage ─────────────────────────────────────────────────────────────────

  get filtered(): Membre[] {
    const q = this.searchQuery.toLowerCase().trim();
    return this.membres.filter((m) => {
      const matchSearch =
        !q ||
        `${m.prenom} ${m.nom}`.toLowerCase().includes(q) ||
        (m.telephone ?? '').includes(q);
      const matchStatut =
        !this.statutFilter ||
        (this.statutFilter === 'actif' ? m.actif : !m.actif);
      const matchCotisation =
        !this.cotisationFilter || m.statut_cotisation === this.cotisationFilter;
      return matchSearch && matchStatut && matchCotisation;
    });
  }

  onSearch(): void { this.page = 1; this.syncUrl(); }
  onFilterChange(): void { this.page = 1; this.syncUrl(); }

  clearFilters(): void {
    this.searchQuery = '';
    this.statutFilter = '';
    this.cotisationFilter = '';
    this.page = 1;
    this.syncUrl();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.statutFilter || this.cotisationFilter);
  }

  private syncUrl(): void {
    const queryParams: Record<string, string | number | null> = {};
    if (this.searchQuery)      queryParams['q']          = this.searchQuery;
    if (this.statutFilter)     queryParams['statut']     = this.statutFilter;
    if (this.cotisationFilter) queryParams['cotisation'] = this.cotisationFilter;
    if (this.page > 1)         queryParams['page']       = this.page;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  // ── Pagination ────────────────────────────────────────────────────────────────

  get totalPages(): number {
    return Math.max(Math.ceil(this.filtered.length / this.pageSize), 1);
  }

  get paginated(): Membre[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.page = p;
      this.syncUrl();
    }
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────────

  get totalMembres(): number { return this.membres.length; }

  get membresActifs(): number { return this.membres.filter(m => m.actif).length; }

  get tauxActivite(): number {
    return this.membres.length ? Math.round((this.membresActifs / this.membres.length) * 100) : 0;
  }

  get nouveauxCeMois(): number {
    const mois = new Date().toISOString().slice(0, 7);
    return this.membres.filter((m) => (m.created_at ?? '').startsWith(mois)).length;
  }

  get cotisationsEnRetard(): number {
    return this.membres.filter((m) => m.actif && m.statut_cotisation === 'en_retard').length;
  }

  get maxCotise(): number {
    return Math.max(...this.membres.map((m) => m.total_cotise ?? 0), 1);
  }

  barreProgression(m: Membre): number {
    const max = this.maxCotise;
    return max > 0 ? Math.round(((m.total_cotise ?? 0) / max) * 100) : 0;
  }

  formatMontant(n: number): string {
    if (n === 0) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + ' M FCFA';
    if (n >= 1_000) return Math.round(n / 1_000) + ' k FCFA';
    return n + ' FCFA';
  }

  // ── Affichage ─────────────────────────────────────────────────────────────────

  getInitiales(m: Membre): string {
    return `${((m.prenom ?? m.nom)[0] ?? '').toUpperCase()}${(m.nom[0] ?? '').toUpperCase()}`;
  }

  private readonly AVATAR_PALETTES = [
    'bg-secondary-container text-on-secondary-container',
    'bg-primary-fixed text-on-primary-fixed',
    'bg-surface-dim text-on-surface',
    'bg-secondary text-on-secondary',
    'bg-error-container text-on-error-container',
  ];

  getAvatarClass(m: Membre): string {
    return this.AVATAR_PALETTES[m.id % this.AVATAR_PALETTES.length];
  }

  formatTelephone(tel: string | null): string {
    if (!tel) return '—';
    const d = tel.replace(/\D/g, '');
    if (d.length !== 9) return tel;
    return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  get rangeLabel(): string {
    const total = this.filtered.length;
    if (total === 0) return 'Aucun résultat';
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, total);
    return `${start}–${end} sur ${total} membre${total > 1 ? 's' : ''}`;
  }
}

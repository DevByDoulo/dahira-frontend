import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs/operators';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MembresService, Membre } from '../../core/services/membres.service';
import { SkeletonTableComponent } from '../../shared/components/skeleton-table/skeleton-table.component';

@Component({
  selector: 'app-membres',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkeletonTableComponent],
  templateUrl: './membres.component.html',
})
export class MembresComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  membres: Membre[] = [];

  searchQuery = '';
  statutFilter = '';

  page = 1;
  readonly pageSize = 10;

  constructor(
    private membresService: MembresService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(take(1)).subscribe((params) => {
      this.searchQuery  = params['q']      ?? '';
      this.statutFilter = params['statut'] ?? '';
      this.page         = parseInt(params['page'] ?? '1', 10) || 1;
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

  desactiverMembre(membre: Membre): void {
    const action = membre.actif ? 'désactiver' : 'réactiver';
    if (!confirm(`Voulez-vous ${action} ${membre.prenom} ${membre.nom} ?`)) return;

    this.membresService.desactiverMembre(membre.id).subscribe({
      next: (res) => {
        membre.actif = res.data.actif;
      },
      error: () => {
        alert('Une erreur est survenue. Veuillez réessayer.');
      },
    });
  }

  // ── Filtrage ────────────────────────────────────────────────────────────────

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
      return matchSearch && matchStatut;
    });
  }

  onSearch(): void {
    this.page = 1;
    this.syncUrl();
  }

  onFilterChange(): void {
    this.page = 1;
    this.syncUrl();
  }

  private syncUrl(): void {
    const queryParams: Record<string, string | number | null> = {};
    if (this.searchQuery)  queryParams['q']      = this.searchQuery;
    if (this.statutFilter) queryParams['statut'] = this.statutFilter;
    if (this.page > 1)     queryParams['page']   = this.page;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  // ── Pagination ──────────────────────────────────────────────────────────────

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

  // ── KPIs ────────────────────────────────────────────────────────────────────

  get totalMembres(): number {
    return this.membres.length;
  }

  get nouveauxCeMois(): number {
    const mois = new Date().toISOString().slice(0, 7);
    return this.membres.filter((m) => (m.created_at ?? '').startsWith(mois)).length;
  }

  get cotisationsEnRetard(): number {
    return this.membres.filter((m) => m.actif && m.statut_cotisation === 'en_retard').length;
  }

  // ── Affichage ───────────────────────────────────────────────────────────────

  getInitiales(m: Membre): string {
    return `${(m.prenom[0] ?? '').toUpperCase()}${(m.nom[0] ?? '').toUpperCase()}`;
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
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  get rangeLabel(): string {
    const total = this.filtered.length;
    if (total === 0) return 'Aucun membre';
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, total);
    return `Affichage de ${start} à ${end} sur ${total} membre${total > 1 ? 's' : ''}`;
  }
}

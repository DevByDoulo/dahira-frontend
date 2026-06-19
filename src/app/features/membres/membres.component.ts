import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MembresService, Membre } from '../../core/services/membres.service';

@Component({
  selector: 'app-membres',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './membres.component.html',
})
export class MembresComponent implements OnInit {
  isLoading = true;
  membres: Membre[] = [];

  searchQuery = '';
  statutFilter = '';

  page = 1;
  readonly pageSize = 10;

  constructor(private membresService: MembresService) {}

  ngOnInit(): void {
    this.membresService.getMembres().subscribe({
      next: (res) => {
        if (res.success) this.membres = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
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
  }

  onFilterChange(): void {
    this.page = 1;
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
    if (p >= 1 && p <= this.totalPages) this.page = p;
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

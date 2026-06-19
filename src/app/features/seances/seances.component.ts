import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SeancesService, Seance } from '../../core/services/seances.service';

type StatutFilter = '' | 'a_venir' | 'en_cours' | 'termine';

@Component({
  selector: 'app-seances',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './seances.component.html',
})
export class SeancesComponent implements OnInit {
  isLoading = true;
  seances: Seance[] = [];

  dateDebut = '';
  dateFin = '';
  statutFilter: StatutFilter = '';

  page = 1;
  readonly pageSize = 10;

  private readonly today = new Date();
  private readonly todayStr = this.today.toISOString().split('T')[0];

  constructor(private seancesService: SeancesService) {}

  ngOnInit(): void {
    this.seancesService.getSeances().subscribe({
      next: (res) => {
        if (res.success) this.seances = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  // ── Statut ──────────────────────────────────────────────────────────────────

  getStatut(s: Seance): 'termine' | 'en_cours' | 'a_venir' {
    if (s.cloturee) return 'termine';
    const dateStr = s.date_seance.slice(0, 10);
    if (dateStr === this.todayStr) return 'en_cours';
    return dateStr > this.todayStr ? 'a_venir' : 'termine';
  }

  // ── Filtrage ────────────────────────────────────────────────────────────────

  get filtered(): Seance[] {
    return this.seances.filter((s) => {
      const dateStr = s.date_seance.slice(0, 10);
      if (this.dateDebut && dateStr < this.dateDebut) return false;
      if (this.dateFin && dateStr > this.dateFin) return false;
      if (this.statutFilter && this.getStatut(s) !== this.statutFilter) return false;
      return true;
    });
  }

  onFilterChange(): void {
    this.page = 1;
  }

  resetFiltres(): void {
    this.dateDebut = '';
    this.dateFin = '';
    this.statutFilter = '';
    this.page = 1;
  }

  // ── Pagination ──────────────────────────────────────────────────────────────

  get totalPages(): number {
    return Math.max(Math.ceil(this.filtered.length / this.pageSize), 1);
  }

  get paginated(): Seance[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.page = p;
  }

  get rangeLabel(): string {
    const total = this.filtered.length;
    if (total === 0) return 'Aucune séance';
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, total);
    return `Affichage de ${start} à ${end} sur ${total} séance${total > 1 ? 's' : ''}`;
  }

  // ── KPIs ────────────────────────────────────────────────────────────────────

  get totalSeances(): number {
    return this.seances.length;
  }

  get seancesAVenir(): number {
    return this.seances.filter((s) => this.getStatut(s) === 'a_venir').length;
  }

  get seancesTerminees(): number {
    return this.seances.filter((s) => this.getStatut(s) === 'termine').length;
  }

  // ── Affichage ───────────────────────────────────────────────────────────────

  getTitre(s: Seance): string {
    return s.theme ?? this.typeLabel(s.type);
  }

  typeLabel(type: Seance['type']): string {
    const labels: Record<Seance['type'], string> = {
      hebdomadaire: 'Séance hebdomadaire',
      mensuelle:    'Séance mensuelle',
      autre:        'Autre séance',
    };
    return labels[type];
  }

  typeIcon(type: Seance['type']): string {
    const icons: Record<Seance['type'], string> = {
      hebdomadaire: 'menu_book',
      mensuelle:    'calendar_month',
      autre:        'groups_3',
    };
    return icons[type];
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatHeure(heure: string | null): string {
    return heure ?? '—';
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { take } from 'rxjs/operators';
import { SeancesService, Seance } from '../../core/services/seances.service';
import { AuthService } from '../../core/services/auth.service';
import { SkeletonTableComponent } from '../../shared/components/skeleton-table/skeleton-table.component';

type StatutFilter = '' | 'a_venir' | 'en_cours' | 'termine';

@Component({
  selector: 'app-seances',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkeletonTableComponent],
  templateUrl: './seances.component.html',
})
export class SeancesComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  seances: Seance[] = [];

  dateDebut = '';
  dateFin = '';
  statutFilter: StatutFilter = '';

  page = 1;
  readonly pageSize = 10;

  private readonly today = new Date();
  private readonly todayStr = this.today.toISOString().split('T')[0];

  // Création/modification/clôture réservées au bureau et au responsable d'organisation (cf. backend)
  peutGerer = false;

  constructor(
    private seancesService: SeancesService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    const role = this.authService.getUser()?.role ?? '';
    this.peutGerer = ['secretaire_general', 'adjoint', 'responsable_org'].includes(role);
  }

  ngOnInit(): void {
    // Restaurer les filtres depuis l'URL, puis charger
    this.route.queryParams.pipe(take(1)).subscribe((params) => {
      this.dateDebut = params['debut'] ?? '';
      this.dateFin = params['fin'] ?? '';
      this.statutFilter = (params['statut'] ?? '') as StatutFilter;
      this.page = parseInt(params['page'] ?? '1', 10) || 1;
      this.chargerSeances();
    });
  }

  chargerSeances(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.seancesService.getSeances().subscribe({
      next: (res) => {
        if (res.success) this.seances = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les séances. Vérifiez votre connexion.';
        this.isLoading = false;
      },
    });
  }

  confirmerCloture: Seance | null = null;
  isCloturing = false;

  demanderCloture(seance: Seance): void {
    this.confirmerCloture = seance;
  }

  executerCloture(): void {
    if (!this.confirmerCloture || this.isCloturing) return;
    const seance = this.confirmerCloture;
    this.isCloturing = true;
    this.seancesService.cloturerSeance(seance.id).subscribe({
      next: (res) => {
        seance.cloturee = res.data.cloturee;
        this.confirmerCloture = null;
        this.isCloturing = false;
      },
      error: () => {
        this.confirmerCloture = null;
        this.isCloturing = false;
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
    this.syncUrl();
  }

  resetFiltres(): void {
    this.dateDebut = '';
    this.dateFin = '';
    this.statutFilter = '';
    this.page = 1;
    this.syncUrl();
  }

  private syncUrl(): void {
    const queryParams: Record<string, string | number | null> = {};
    if (this.dateDebut) queryParams['debut'] = this.dateDebut;
    if (this.dateFin) queryParams['fin'] = this.dateFin;
    if (this.statutFilter) queryParams['statut'] = this.statutFilter;
    if (this.page > 1) queryParams['page'] = this.page;

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

  get paginated(): Seance[] {
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
      dahira: 'Dahira',
      mensuelle: 'Séance mensuelle',
      autre: 'Autre séance',
    };
    return labels[type];
  }

  typeIcon(type: Seance['type']): string {
    const icons: Record<Seance['type'], string> = {
      dahira: 'menu_book',
      mensuelle: 'calendar_month',
      autre: 'groups_3',
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

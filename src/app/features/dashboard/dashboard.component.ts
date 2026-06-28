import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  DashboardService,
  TopContributeur,
  ComparativeStats,
  ActivityItem,
} from '../../core/services/dashboard.service';
import { AnnoncesService, Annonce } from '../../core/services/annonces.service';
import { environment } from '../../../environments/environment';

interface BarData {
  label: string;
  active: boolean;
  montant: number;
  nombre: number;
}

interface EventItem {
  id: number;
  day: string;
  month: string;
  title: string;
  time: string;
  place: string;
  type: string;
  daysUntil: number;
  nbParticipants: number;
  maxParticipants: number | null;
  inscriptionsOuvertes: boolean;
}

interface TresPoint {
  x: number;
  y: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  isLoading = true;

  readonly role: string =
    (JSON.parse(localStorage.getItem('user') ?? 'null') as { role?: string } | null)?.role ?? '';

  readonly backendUrl = environment.apiUrl.replace('/api', '');

  get isFinancier(): boolean {
    return (this.role === 'secretaire_general' || this.role === 'adjoint') || this.role === 'tresorier';
  }

  get userName(): string {
    return (
      (JSON.parse(localStorage.getItem('user') ?? 'null') as { nom?: string } | null)?.nom ??
      'Membre'
    );
  }

  // KPIs principaux
  totalMembres = 0;
  membresActifs = 0;
  membresNouveaux = 0;
  membresEnRetard = 0;
  cotisationsMois = 0;
  cotisationsApprouvees = 0;
  cotisationsEnAttente = 0;
  tauxAJour = 0;
  soldeTresorerie = 0;
  entreesTotal = 0;
  sortiesTotal = 0;
  evenementsCount = 0;

  // Graphiques — barres
  private allBarsData: BarData[] = [];
  chartPeriod: 6 | 12 = 6;
  hoveredBarIndex: number | null = null;

  get bars(): BarData[] { return this.allBarsData.slice(-this.chartPeriod); }

  get barMaxMontant(): number { return Math.max(...this.bars.map(b => b.montant), 1); }

  get barTotalPeriod(): number { return this.bars.reduce((s, b) => s + b.montant, 0); }

  readonly yAxisTicks = [100, 75, 50, 25, 0] as const;

  // Graphiques — courbe trésorerie
  tresLineD = '';
  tresAreaD = '';
  tresPts: TresPoint[] = [];
  tresFirstLabel = 'Jan';
  tresLastLabel = '';
  hoveredTresIndex: number | null = null;
  tresRawData: Array<{ label: string; solde: number }> = [];
  private tresMinSolde = 0;
  private tresMaxSolde = 1;

  get tresYLabels(): Array<{ text: string; y: number }> {
    const range = this.tresMaxSolde - this.tresMinSolde || 1;
    return [0, 1, 2, 3, 4].map(i => ({
      text: this.formatFCFAShort(Math.round(this.tresMinSolde + (range * (4 - i)) / 4)),
      y: 10 + (i / 4) * 75,
    }));
  }

  events: EventItem[] = [];
  annonces: Annonce[] = [];
  topContributeurs: TopContributeur[] = [];

  // Comparatif mois en cours vs précédent
  comparative: ComparativeStats | null = null;

  // Activité récente
  recentActivity: ActivityItem[] = [];

  // Répartition paiements
  repartitionPaiements: Array<{ mode: string; nombre: number; montant: number; pct: number }> = [];

  constructor(
    private dashboardService: DashboardService,
    private annoncesService: AnnoncesService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    forkJoin({
      stats: this.dashboardService.getStats().pipe(catchError(() => of(null))),
      charts: this.dashboardService.getCharts().pipe(catchError(() => of(null))),
      annonces: this.annoncesService.getAnnonces().pipe(catchError(() => of(null))),
      comparative: this.dashboardService.getComparative().pipe(catchError(() => of(null))),
      activity: this.dashboardService.getActivity().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ stats, charts, annonces, comparative, activity }) => {
        if (stats?.success) {
          const d = stats.data;
          this.totalMembres         = d.membres.total ?? 0;
          this.membresActifs        = Number(d.membres.actifs ?? 0);
          this.membresNouveaux      = Number(d.membres.nouveaux_ce_mois ?? 0);
          this.membresEnRetard      = Number(d.cotisations.membres_en_retard ?? 0);
          this.cotisationsMois      = Number(d.cotisations.montant_total_mois ?? 0);
          this.cotisationsApprouvees = Number(d.cotisations.approuvees ?? 0);
          this.cotisationsEnAttente = Number(d.cotisations.en_attente ?? 0);
          this.tauxAJour            = Number(d.cotisations.taux_a_jour ?? 0);
          this.soldeTresorerie      = Number(d.tresorerie.solde_global ?? 0);
          this.entreesTotal         = Number(d.tresorerie.entrees_total ?? 0);
          this.sortiesTotal         = Number(d.tresorerie.sorties_total ?? 0);
          this.evenementsCount      = d.evenements_a_venir?.length ?? 0;
          this.events = (d.evenements_a_venir ?? []).map((e: any) => ({
            id: e.id,
            ...this.parseEventDate(e.date_debut),
            title: e.titre,
            time: this.parseEventTime(e.date_debut),
            place: e.lieu ?? '',
            type: e.type ?? 'autre',
            daysUntil: this.daysUntil(e.date_debut),
            nbParticipants: Number(e.nb_participants ?? 0),
            maxParticipants: e.max_participants != null ? Number(e.max_participants) : null,
            inscriptionsOuvertes: e.inscriptions_ouvertes != null ? Boolean(e.inscriptions_ouvertes) : false,
          }));
          this.topContributeurs = d.top_contributeurs ?? [];
        }

        if (charts?.success) {
          const evoCot = charts.data.evolution_cotisations;
          this.allBarsData = this.buildBars(this.fillMissingMonths(evoCot ?? [], 12));

          const evoTres = charts.data.evolution_tresorerie;
          if (evoTres?.length) this.buildTresChart(evoTres);

          const rep = charts.data.repartition_paiement ?? [];
          const totalRep = rep.reduce((s: number, r: { montant: number }) => s + Number(r.montant), 0) || 1;
          this.repartitionPaiements = rep.map((r: { mode_paiement: string; nombre: number; montant: number }) => ({
            mode: r.mode_paiement,
            nombre: Number(r.nombre),
            montant: Number(r.montant),
            pct: Math.round((Number(r.montant) / totalRep) * 100),
          })).sort((a: { montant: number }, b: { montant: number }) => b.montant - a.montant);
        }

        if (annonces?.success) {
          this.annonces = (annonces.data ?? []).slice(0, 5);
        }

        if (comparative?.success) {
          this.comparative = comparative.data;
        }

        if (activity?.success) {
          this.recentActivity = activity.data ?? [];
        }

        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  setChartPeriod(p: 6 | 12): void {
    this.chartPeriod = p;
  }

  private fillMissingMonths(
    data: Array<{ mois: string; nombre: number; montant: number }>,
    months: number,
  ): Array<{ mois: string; nombre: number; montant: number }> {
    const map = new Map(data.map(d => [d.mois, d]));
    const result: Array<{ mois: string; nombre: number; montant: number }> = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push(map.get(key) ?? { mois: key, nombre: 0, montant: 0 });
    }
    return result;
  }

  barHeightPx(bar: BarData): number {
    return Math.max(Math.round((bar.montant / this.barMaxMontant) * 140), 4);
  }

  private buildBars(data: Array<{ mois: string; nombre: number; montant: number }>): BarData[] {
    const lastMois = data[data.length - 1]?.mois;
    return data.map(d => ({
      label: this.formatMonthShort(d.mois),
      active: d.mois === lastMois,
      montant: Number(d.montant),
      nombre: Number(d.nombre),
    }));
  }

  private buildTresChart(
    data: Array<{ periode: string; solde: number; entrees: number; sorties: number }>,
  ): void {
    const n = data.length;
    const soldes = data.map(d => Number(d.solde));
    const maxS = Math.max(...soldes);
    const minS = Math.min(...soldes, 0);
    const range = maxS - minS || 1;

    this.tresMinSolde = minS;
    this.tresMaxSolde = maxS;

    this.tresRawData = data.map((d, i) => ({
      label: this.formatMonthShort(d.periode),
      solde: Number(d.solde),
    }));

    this.tresPts = soldes.map((s, i) => ({
      x: +(n === 1 ? 50 : (i / (n - 1)) * 100).toFixed(1),
      y: +(85 - ((s - minS) / range) * 70).toFixed(1),
    }));

    this.tresLineD = this.smoothCatmullRom(this.tresPts);
    this.tresAreaD = `${this.tresLineD} L${this.tresPts[n - 1].x},95 L${this.tresPts[0].x},95 Z`;
    this.tresFirstLabel = this.formatMonthShort(data[0].periode);
    this.tresLastLabel = this.formatMonthShort(data[n - 1].periode);
  }

  private smoothCatmullRom(pts: TresPoint[]): string {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
    if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;

    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = +(p1.x + (p2.x - p0.x) / 6).toFixed(2);
      const cp1y = +(p1.y + (p2.y - p0.y) / 6).toFixed(2);
      const cp2x = +(p2.x - (p3.x - p1.x) / 6).toFixed(2);
      const cp2y = +(p2.y - (p3.y - p1.y) / 6).toFixed(2);
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  }

  private formatMonthShort(moisStr: string): string {
    const [year, month] = moisStr.split('-');
    return new Date(+year, +month - 1).toLocaleDateString('fr-FR', { month: 'short' });
  }

  private parseEventDate(dateStr: string): { day: string; month: string } {
    const d = new Date(dateStr);
    return {
      day: d.getDate().toString().padStart(2, '0'),
      month: d.toLocaleDateString('fr-FR', { month: 'short' }),
    };
  }

  private parseEventTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  daysUntil(dateStr: string): number {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86_400_000);
  }

  eventUrgencyLabel(days: number): string {
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Demain';
    if (days <= 7) return `Dans ${days} jours`;
    return '';
  }

  eventTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      conference: 'Conférence', sortie: 'Sortie', ceremonie: 'Cérémonie',
      formation: 'Formation', autre: 'Événement',
    };
    return labels[type] ?? 'Événement';
  }

  eventTypeColor(_type: string): string {
    return 'bg-surface-container text-on-surface-variant border-outline-variant/30';
  }

  eventAccentColor(_type: string): string {
    return 'bg-outline-variant/50';
  }

  participationPct(nb: number, max: number): number {
    return Math.min(Math.round((nb / max) * 100), 100);
  }

  formatFCFA(value: number): string {
    const n = Math.round(value);
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  formatFCFAShort(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K';
    return String(Math.round(value));
  }

  formatAnnonceDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }

  avatarUrl(url: string | null): string | null {
    if (!url) return null;
    return url.startsWith('http') ? url : `${this.backendUrl}${url}`;
  }

  initiales(nom: string, prenom: string): string {
    return `${(prenom ?? '?')[0]}${(nom ?? '?')[0]}`.toUpperCase();
  }

  navigateToEvents(): void {
    this.router.navigate(['/evenements']);
  }

  navigateToPendingCotisations(): void {
    this.router.navigate(['/cotisations']);
  }

  // ── Comparatif ───────────────────────────────────────────────────────────────
  evoMontant(): number {
    return Number(this.comparative?.cotisations.montant.evolution ?? 0);
  }

  evoNouveauxMembres(): number {
    return Number(this.comparative?.nouveaux_membres.evolution ?? 0);
  }

  evoBadgeClass(pct: number): string {
    if (pct > 0) return 'bg-secondary/15 text-secondary';
    if (pct < 0) return 'bg-error/15 text-error';
    return 'bg-surface-container-high text-on-surface-variant';
  }

  evoBadgeLabel(pct: number): string {
    if (pct > 0) return `+${pct}%`;
    if (pct < 0) return `${pct}%`;
    return '=';
  }

  // ── Activité récente ─────────────────────────────────────────────────────────
  activityIcon(type: string): string {
    if (type === 'cotisation') return 'payments';
    if (type === 'nouveau_membre') return 'person_add';
    return 'campaign';
  }

  activityLabel(item: ActivityItem): string {
    if (item.type === 'cotisation')
      return `${item.prenom ?? ''} ${item.nom} — ${this.formatFCFA(item.montant ?? 0)} FCFA`;
    if (item.type === 'nouveau_membre') return `Nouveau membre : ${item.prenom ?? ''} ${item.nom}`;
    return item.titre ?? 'Annonce';
  }

  activityTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 60) return `Il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Il y a ${h} h`;
    const d = Math.floor(h / 24);
    return `Il y a ${d} j`;
  }

  // ── Mode de paiement ─────────────────────────────────────────────────────────
  modeLabel(mode: string): string {
    const labels: Record<string, string> = {
      especes: 'Espèces', mobile_money: 'Mobile Money', virement: 'Virement',
      cheque: 'Chèque', carte: 'Carte', autre: 'Autre',
    };
    return labels[mode] ?? mode;
  }

  modeColor(i: number): string {
    const colors = ['#006a61', '#4a90d9', '#e07b39', '#76777d', '#ba1a1a'];
    return colors[i % colors.length];
  }
}


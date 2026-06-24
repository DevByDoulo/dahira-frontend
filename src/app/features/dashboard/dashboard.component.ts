import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DashboardService } from '../../core/services/dashboard.service';

interface BarData {
  label: string;
  heightPx: number;
  active: boolean;
}

interface EventItem {
  id: number;
  day: string;
  month: string;
  title: string;
  time: string;
  place: string;
}

interface TresPoint {
  x: number;
  y: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  isLoading = true;

  totalMembres = 0;
  membresActifs = 0;
  cotisationsMois = 0;
  tauxAJour = 0;
  soldeTresorerie = 0;
  evenementsCount = 0;

  // Hauteurs en px (base 180px) pour éviter la dépendance circulaire des % dans flex
  bars: BarData[] = [
    { label: 'Jan', heightPx: 72, active: false },
    { label: 'Fév', heightPx: 99, active: false },
    { label: 'Mar', heightPx: 81, active: false },
    { label: 'Avr', heightPx: 126, active: false },
    { label: 'Mai', heightPx: 153, active: false },
    { label: 'Juin', heightPx: 171, active: true },
  ];

  // SVG évolution solde — chemin décoratif par défaut, remplacé par les vraies données
  tresLineD = 'M0,80 Q20,75 40,60 T80,30 T100,20';
  tresAreaD = 'M0,80 Q20,75 40,60 T80,30 T100,20 L100,100 L0,100 Z';
  tresPts: TresPoint[] = [{ x: 0, y: 80 }, { x: 40, y: 60 }, { x: 100, y: 20 }];
  tresFirstLabel = 'Jan';
  tresLastLabel = 'Juin';

  events: EventItem[] = [];

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    forkJoin({
      stats: this.dashboardService.getStats().pipe(catchError(() => of(null))),
      charts: this.dashboardService.getCharts().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ stats, charts }) => {
        if (stats?.success) {
          const d = stats.data;
          this.totalMembres = d.membres.total ?? 0;
          this.membresActifs = Number(d.membres.actifs ?? 0);
          this.cotisationsMois = Number(d.cotisations.montant_total_mois ?? 0);
          this.tauxAJour = Number(d.cotisations.taux_a_jour ?? 0);
          this.soldeTresorerie = Number(d.tresorerie.solde_global ?? 0);
          this.evenementsCount = d.evenements_a_venir?.length ?? 0;
          this.events = (d.evenements_a_venir ?? []).map(e => ({
            id: e.id,
            ...this.parseEventDate(e.date_evenement),
            title: e.titre,
            time: this.parseEventTime(e.date_evenement),
            place: e.lieu ?? '',
          }));
        }

        if (charts?.success) {
          const evoCot = charts.data.evolution_cotisations;
          if (evoCot?.length) {
            this.bars = this.buildBars(evoCot);
          }

          const evoTres = charts.data.evolution_tresorerie;
          if (evoTres?.length) {
            this.buildTresChart(evoTres);
          }
        }

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  // SUM(DECIMAL) depuis mysql2 revient en string → Number() obligatoire
  private buildBars(data: Array<{ mois: string; nombre: number; montant: number }>): BarData[] {
    const slice = data.slice(-6);
    const max = Math.max(...slice.map(d => Number(d.montant)), 1);
    const lastMois = slice[slice.length - 1]?.mois;
    return slice.map(d => ({
      label: this.formatMonthShort(d.mois),
      heightPx: Math.max(Math.round((Number(d.montant) / max) * 180), 4),
      active: d.mois === lastMois,
    }));
  }

  // Génère le chemin SVG depuis les vraies données de trésorerie
  private buildTresChart(
    data: Array<{ periode: string; solde: number; entrees: number; sorties: number }>,
  ): void {
    const n = data.length;
    const soldes = data.map(d => Number(d.solde));
    const maxS = Math.max(...soldes);
    const minS = Math.min(...soldes, 0);
    const range = maxS - minS || 1;

    this.tresPts = soldes.map((s, i) => ({
      x: +(n === 1 ? 50 : (i / (n - 1)) * 100).toFixed(1),
      y: +(90 - ((s - minS) / range) * 75).toFixed(1),
    }));

    this.tresLineD = 'M' + this.tresPts.map(p => `${p.x},${p.y}`).join(' L');
    this.tresAreaD = `${this.tresLineD} L100,100 L0,100 Z`;
    this.tresFirstLabel = this.formatMonthShort(data[0].periode);
    this.tresLastLabel = this.formatMonthShort(data[n - 1].periode);
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

  formatFCFA(value: number): string {
    const n = Math.round(value);
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  navigateToEvents(): void {
    this.router.navigate(['/evenements']);
  }
}

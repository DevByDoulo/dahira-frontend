import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';

interface BarData {
  label: string;
  heightPct: number;
  active: boolean;
}

interface EventItem {
  day: string;
  month: string;
  title: string;
  time: string;
  place: string;
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

  bars: BarData[] = [
    { label: 'Jan', heightPct: 40, active: false },
    { label: 'Fév', heightPct: 55, active: false },
    { label: 'Mar', heightPct: 45, active: false },
    { label: 'Avr', heightPct: 70, active: false },
    { label: 'Mai', heightPct: 85, active: false },
    { label: 'Juin', heightPct: 95, active: true },
  ];

  events: EventItem[] = [];

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    forkJoin({
      stats: this.dashboardService.getStats(),
      charts: this.dashboardService.getCharts(),
    }).subscribe({
      next: ({ stats, charts }) => {
        if (stats.success) {
          const d = stats.data;
          this.totalMembres = d.membres.total ?? 0;
          this.membresActifs = d.membres.actifs ?? 0;
          this.cotisationsMois = d.cotisations.montant_total_mois ?? 0;
          this.tauxAJour = Number(d.cotisations.taux_a_jour ?? 0);
          this.soldeTresorerie = d.tresorerie.solde_global ?? 0;
          this.evenementsCount = d.evenements_a_venir?.length ?? 0;
          this.events = (d.evenements_a_venir ?? []).map(e => ({
            ...this.parseEventDate(e.date_evenement),
            title: e.titre,
            time: this.parseEventTime(e.date_evenement),
            place: e.lieu ?? '',
          }));
        }
        if (charts.success) {
          const evo = charts.data.evolution_cotisations;
          if (evo?.length) {
            this.bars = this.buildBars(evo);
          }
        }
        this.isLoading = false;
      },
      error: () => {
        this.setDemoData();
        this.isLoading = false;
      },
    });
  }

  private setDemoData(): void {
    this.totalMembres = 1284;
    this.membresActifs = 1210;
    this.cotisationsMois = 450000;
    this.tauxAJour = 94.2;
    this.soldeTresorerie = 2840500;
    this.evenementsCount = 3;
    this.events = [
      { day: '15', month: 'Juil', title: 'Assemblée Générale Mensuelle', time: '16:30', place: 'Siège Social, Dakar' },
      { day: '22', month: 'Juil', title: 'Dîner de Bienfaisance Annuel', time: '20:00', place: 'King Fahd Palace' },
      { day: '05', month: 'Août', title: "Conférence sur l'Investissement Communautaire", time: '09:00', place: 'Centre de Conférence, Diamniadio' },
    ];
  }

  private buildBars(data: Array<{ mois: string; montant: number }>): BarData[] {
    const slice = data.slice(-6);
    const max = Math.max(...slice.map(d => d.montant), 1);
    const lastMois = slice[slice.length - 1]?.mois;
    return slice.map(d => ({
      label: this.formatMonthShort(d.mois),
      heightPct: Math.round((d.montant / max) * 95),
      active: d.mois === lastMois,
    }));
  }

  private formatMonthShort(moisStr: string): string {
    const [year, month] = moisStr.split('-');
    const date = new Date(+year, +month - 1);
    return date.toLocaleDateString('fr-FR', { month: 'short' });
  }

  private parseEventDate(dateStr: string): { day: string; month: string } {
    const d = new Date(dateStr);
    return {
      day: d.getDate().toString().padStart(2, '0'),
      month: d.toLocaleDateString('fr-FR', { month: 'short' }),
    };
  }

  private parseEventTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  formatFCFA(value: number): string {
    return value.toLocaleString('fr-FR');
  }

  navigateToEvents(): void {
    this.router.navigate(['/evenements']);
  }
}

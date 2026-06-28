import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  TresorerieService,
  SoldeTresorerie,
  Transaction,
  EvolutionPoint,
  Alerte,
} from '../../core/services/tresorerie.service';

interface ChartPoint {
  x: number;
  yE: number;
  yS: number;
  label: string;
  montantE: number;
  montantS: number;
  periode: string;
  solde: number;
}

@Component({
  selector: 'app-tresorerie',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tresorerie.component.html',
})
export class TresorerieComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  isExporting = false;
  isExportingRapport = false;
  moisRapport: string = new Date().toISOString().slice(0, 7);
  menuExportOuvert = false;

  solde: SoldeTresorerie | null = null;
  dernieresEntrees: Transaction[] = [];
  dernieresSorties: Transaction[] = [];
  evolution: EvolutionPoint[] = [];
  alertes: Alerte[] = [];
  periodeNbMois: 6 | 12 = 6;

  hoveredPoint: ChartPoint | null = null;

  // ── Constantes SVG ───────────────────────────────────────────────────────
  readonly CW = 1000;
  readonly CH = 260;
  readonly PAD_L = 72;
  readonly PAD_R = 16;
  readonly PAD_T = 16;
  readonly PAD_B = 44;

  constructor(private tresorerieService: TresorerieService) {}

  @HostListener('document:click')
  onDocumentClick(): void {
    this.menuExportOuvert = false;
  }

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.hoveredPoint = null;

    forkJoin({
      solde: this.tresorerieService.getSolde(),
      entrees: this.tresorerieService.getTransactions(5, 'entree'),
      sorties: this.tresorerieService.getTransactions(5, 'sortie'),
      evolution: this.tresorerieService.getEvolution('mois'),
      alertes: this.tresorerieService.getAlertes(),
    }).subscribe({
      next: (res) => {
        this.solde = res.solde.data;
        this.dernieresEntrees = res.entrees.data ?? [];
        this.dernieresSorties = res.sorties.data ?? [];
        this.evolution = res.evolution.data ?? [];
        this.alertes = res.alertes.data ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les données de trésorerie.';
        this.isLoading = false;
      },
    });
  }

  // ── KPI mois en cours ────────────────────────────────────────────────────

  get collecteCeMois(): number {
    return this.evolution.at(-1)?.entrees ?? 0;
  }

  get depenseCeMois(): number {
    return this.evolution.at(-1)?.sorties ?? 0;
  }

  get soldeCeMois(): number {
    return this.collecteCeMois - this.depenseCeMois;
  }

  get tendanceCollectePct(): number | null {
    const curr = this.evolution.at(-1);
    const prev = this.evolution.at(-2);
    if (!curr || !prev || prev.entrees === 0) return null;
    return Math.round(((curr.entrees - prev.entrees) / prev.entrees) * 100);
  }

  get tendanceDepensePct(): number | null {
    const curr = this.evolution.at(-1);
    const prev = this.evolution.at(-2);
    if (!curr || !prev || prev.sorties === 0) return null;
    return Math.round(((curr.sorties - prev.sorties) / prev.sorties) * 100);
  }

  // ── Graphique SVG ────────────────────────────────────────────────────────

  get evolutionFiltered(): EvolutionPoint[] {
    return this.evolution.slice(-this.periodeNbMois);
  }

  get chartPlotW(): number { return this.CW - this.PAD_L - this.PAD_R; }
  get chartPlotH(): number { return this.CH - this.PAD_T - this.PAD_B; }
  get chartBaseY(): number { return this.PAD_T + this.chartPlotH; }

  get chartMax(): number {
    const vals = this.evolutionFiltered.flatMap((p) => [p.entrees, p.sorties]);
    return Math.max(...vals, 1);
  }

  get chartPoints(): ChartPoint[] {
    const pts = this.evolutionFiltered;
    if (pts.length === 0) return [];
    const n = pts.length;
    const scaleY = (v: number) =>
      this.chartBaseY - (v / this.chartMax) * this.chartPlotH;

    return pts.map((p, i) => ({
      x: this.PAD_L + (n === 1 ? this.chartPlotW / 2 : (i / (n - 1)) * this.chartPlotW),
      yE: scaleY(p.entrees),
      yS: scaleY(p.sorties),
      label: this.formatPeriode(p.periode),
      montantE: p.entrees,
      montantS: p.sorties,
      periode: p.periode,
      solde: p.solde,
    }));
  }

  get hoverZoneWidth(): number {
    const pts = this.chartPoints;
    return pts.length > 1 ? pts[1].x - pts[0].x : this.chartPlotW;
  }

  private buildSmoothPath(
    points: Array<{ x: number; y: number }>,
    filled: boolean,
  ): string {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const cpx = (p0.x + p1.x) / 2;
      d += ` C ${cpx} ${p0.y} ${cpx} ${p1.y} ${p1.x} ${p1.y}`;
    }
    if (filled) {
      const last = points[points.length - 1];
      d += ` L ${last.x} ${this.chartBaseY} L ${points[0].x} ${this.chartBaseY} Z`;
    }
    return d;
  }

  get pathEntreesArea(): string {
    return this.buildSmoothPath(
      this.chartPoints.map((p) => ({ x: p.x, y: p.yE })),
      true,
    );
  }

  get pathEntreesLine(): string {
    return this.buildSmoothPath(
      this.chartPoints.map((p) => ({ x: p.x, y: p.yE })),
      false,
    );
  }

  get pathSortiesArea(): string {
    return this.buildSmoothPath(
      this.chartPoints.map((p) => ({ x: p.x, y: p.yS })),
      true,
    );
  }

  get pathSortiesLine(): string {
    return this.buildSmoothPath(
      this.chartPoints.map((p) => ({ x: p.x, y: p.yS })),
      false,
    );
  }

  get yGridLines(): Array<{ y: number; label: string }> {
    const max = this.chartMax;
    return [0, 25, 50, 75, 100].map((pct) => ({
      y: this.chartBaseY - (pct / 100) * this.chartPlotH,
      label: pct === 0 ? '0' : this.formatMontantCourt((max * pct) / 100),
    }));
  }

  tooltipX(pt: ChartPoint): number {
    return pt.x > this.CW - 165 ? pt.x - 155 : pt.x + 12;
  }

  tooltipY(pt: ChartPoint): number {
    const top = Math.min(pt.yE, pt.yS) - 82;
    return top < this.PAD_T ? this.PAD_T + 2 : top;
  }

  setPeriode(n: 6 | 12): void {
    this.periodeNbMois = n;
    this.hoveredPoint = null;
  }

  // ── Mode de paiement ─────────────────────────────────────────────────────

  modePaiementLabel(mode: string): string {
    const labels: Record<string, string> = {
      especes: 'Espèces',
      wave: 'Wave',
      orange_money: 'Orange Money',
    };
    return labels[mode] ?? mode;
  }

  modePaiementClass(_mode: string): string {
    return 'bg-surface-container-high text-on-surface-variant';
  }

  modePaiementIcon(mode: string): string {
    if (mode === 'wave') return 'contactless';
    if (mode === 'orange_money') return 'phone_android';
    return 'payments';
  }

  // ── Export rapport mensuel PDF ───────────────────────────────────────────

  exporterRapportMensuel(): void {
    if (this.isExportingRapport) return;
    this.isExportingRapport = true;
    try {
      this.tresorerieService.exportRapportMensuel(this.moisRapport);
    } finally {
      setTimeout(() => (this.isExportingRapport = false), 2000);
    }
  }

  // ── Export CSV ───────────────────────────────────────────────────────────

  exporterCSV(): void {
    this.isExporting = true;
    this.tresorerieService.getTransactions(1000).subscribe({
      next: (res) => {
        const rows = res.data ?? [];
        const header = 'Type,Description,Membre,Montant (FCFA),Mode de paiement,Date';
        const lines = rows.map((t) =>
          [
            t.type === 'entree' ? 'Entrée' : 'Dépense',
            `"${(t.description ?? '').replace(/"/g, '""')}"`,
            t.membre_nom ?? '',
            t.montant,
            this.modePaiementLabel(t.mode_paiement),
            new Date(t.date).toLocaleDateString('fr-FR'),
          ].join(','),
        );
        const csv = [header, ...lines].join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `releve-tresorerie-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.isExporting = false;
      },
      error: () => {
        this.isExporting = false;
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  formatMontant(m: number | string): string {
    const n = Math.round(Number(m));
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  }

  formatMontantCourt(m: number | string): string {
    const n = Number(m);
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1_000) return Math.round(n / 1_000) + 'k';
    return Math.round(n).toString();
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  formatPeriode(p: string): string {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const idx = parseInt(p.split('-')[1], 10) - 1;
    return months[idx] ?? p;
  }

  entreeIcon(t: Transaction): string {
    return t.membre_nom ? 'person' : 'volunteer_activism';
  }

  sortieIcon(t: Transaction): string {
    const desc = (t.description ?? '').toLowerCase();
    if (desc.includes('mainte') || desc.includes('répara') || desc.includes('repara')) return 'home_repair_service';
    if (desc.includes('nourriture') || desc.includes('restaur') || desc.includes('traiteur') || desc.includes('repas')) return 'restaurant';
    if (desc.includes('internet') || desc.includes('réseau') || desc.includes('abonnement')) return 'router';
    if (desc.includes('location') || desc.includes('loyer') || desc.includes('salle')) return 'location_on';
    if (desc.includes('transport') || desc.includes('déplacement')) return 'directions_car';
    if (desc.includes('don') || desc.includes('solidar')) return 'volunteer_activism';
    return 'receipt_long';
  }

  alerteClass(_a: Alerte): string {
    return 'bg-surface-container border border-outline-variant/30 text-on-surface-variant';
  }

  alerteIconClass(_a: Alerte): string {
    return 'text-on-surface-variant';
  }

  alerteIcon(a: Alerte): string {
    return a.type === 'danger' ? 'error' : 'warning';
  }
}

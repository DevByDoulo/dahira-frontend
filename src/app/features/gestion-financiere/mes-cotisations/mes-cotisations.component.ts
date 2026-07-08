import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CotisationsService, Cotisation } from '../../../core/services/cotisations.service';
import { SkeletonTableComponent } from '../../../shared/components/skeleton-table/skeleton-table.component';

@Component({
  selector: 'app-mes-cotisations',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonTableComponent],
  templateUrl: './mes-cotisations.component.html',
})
export class MesCotisationsComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  cotisations: Cotisation[] = [];

  constructor(private cotisationsService: CotisationsService) {}

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cotisationsService.getMesCotisations().subscribe({
      next: (res) => {
        if (res.success) this.cotisations = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger vos cotisations. Vérifiez votre connexion.';
        this.isLoading = false;
      },
    });
  }

  get totalApprouve(): number {
    return this.cotisations
      .filter((c) => c.statut === 'approved')
      .reduce((somme, c) => somme + Number(c.montant), 0);
  }

  get nbEnAttente(): number {
    return this.cotisations.filter((c) => c.statut === 'pending').length;
  }

  formatMontant(montant: number): string {
    return `${Math.round(Number(montant)).toLocaleString('fr-FR')} FCFA`;
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  modeLabel(mode: string): string {
    const labels: Record<string, string> = {
      especes: 'Espèces',
      wave: 'Wave',
      orange_money: 'Orange Money',
    };
    return labels[mode] ?? mode;
  }

  statutLabel(statut: Cotisation['statut']): string {
    const labels: Record<Cotisation['statut'], string> = {
      pending: 'En attente',
      approved: 'Validée',
      rejected: 'Rejetée',
    };
    return labels[statut];
  }
}

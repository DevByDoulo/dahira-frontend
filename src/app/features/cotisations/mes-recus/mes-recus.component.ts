import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Recu {
  id: number;
  cotisation_id: number;
  numero_recu: string;
  fichier_path: string | null;
  montant: number;
  mode_paiement: string;
  date_cotisation: string;
}

@Component({
  selector: 'app-mes-recus',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mes-recus.component.html',
})
export class MesRecusComponent implements OnInit {
  recus: Recu[] = [];
  isLoading = true;
  errorMessage = '';
  downloadingId: number | null = null;
  downloadError = '';

  private readonly apiUrl = environment.apiUrl;
  private readonly membreId: number | null =
    (JSON.parse(localStorage.getItem('user') ?? 'null') as { id?: number } | null)?.id ?? null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (!this.membreId) {
      this.errorMessage = 'Impossible de charger vos reçus.';
      this.isLoading = false;
      return;
    }

    this.http
      .get<{ success: boolean; data: Recu[] }>(`${this.apiUrl}/recus/membre/${this.membreId}`)
      .subscribe({
        next: (res) => {
          this.recus = res.success ? res.data : [];
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Impossible de charger vos reçus.';
          this.isLoading = false;
        },
      });
  }

  telecharger(recu: Recu): void {
    this.downloadingId = recu.id;
    this.downloadError = '';

    this.http
      .get(`${this.apiUrl}/recus/${recu.id}/download`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${recu.numero_recu}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          this.downloadingId = null;
        },
        error: () => {
          this.downloadError = 'Erreur lors du téléchargement. Réessayez.';
          this.downloadingId = null;
        },
      });
  }

  formatMontant(n: number | string): string {
    return Math.round(Number(n))
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  modeLabel(mode: string): string {
    const m: Record<string, string> = {
      especes: 'Espèces',
      wave: 'Wave',
      orange_money: 'Orange Money',
    };
    return m[mode] ?? mode;
  }

  modeIcon(mode: string): string {
    return mode === 'wave' ? 'smartphone' : mode === 'orange_money' ? 'phonelink_ring' : 'payments';
  }
}

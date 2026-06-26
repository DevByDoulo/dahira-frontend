import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface Recu {
  id: number;
  cotisation_id: number;
  dahira_id: number;
  numero_recu: string;
  fichier_path: string | null;
  montant: number;
  mode_paiement: string;
  date_cotisation: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  email: string | null;
}

@Component({
  selector: 'app-recus',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recus.component.html',
  styleUrls: ['./recus.component.css'],
})
export class RecusComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  recus: Recu[] = [];

  searchQuery = '';
  dateDebut = '';
  dateFin = '';

  page = 1;
  readonly pageSize = 10;

  showFiltres = false;
  downloadingId: number | null = null;
  printingId: number | null = null;

  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.http.get<{ success: boolean; data: Recu[] }>(`${this.apiUrl}/recus`).subscribe({
      next: (res) => {
        this.recus = res.success ? res.data : [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les reçus.';
        this.isLoading = false;
      },
    });
  }

  // ── Filtrage / pagination ────────────────────────────────────────────────────

  get filtres(): Recu[] {
    let result = this.recus;
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          `${r.prenom} ${r.nom}`.toLowerCase().includes(q) ||
          r.numero_recu.toLowerCase().includes(q),
      );
    }
    if (this.dateDebut) {
      result = result.filter((r) => r.date_cotisation >= this.dateDebut);
    }
    if (this.dateFin) {
      result = result.filter((r) => r.date_cotisation <= this.dateFin + 'T23:59:59');
    }
    return result;
  }

  get paginated(): Recu[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtres.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtres.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get rangeLabel(): string {
    const total = this.filtres.length;
    if (total === 0) return 'Aucun reçu';
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, total);
    return `Affichage ${start}–${end} sur ${total} reçu${total > 1 ? 's' : ''}`;
  }

  onFilterChange(): void {
    this.page = 1;
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.page = p;
  }

  // ── Export CSV ───────────────────────────────────────────────────────────────

  exporterTout(): void {
    const data = this.filtres;
    if (data.length === 0) {
      this.showToast('Aucun reçu à exporter.', 'error');
      return;
    }
    const headers = ['Numéro Reçu', 'Prénom', 'Nom', 'Montant (FCFA)', 'Mode de paiement', 'Date'];
    const rows = data.map((r) => [
      r.numero_recu,
      r.prenom,
      r.nom,
      Math.round(Number(r.montant)).toString(),
      r.mode_paiement,
      this.formatDate(r.date_cotisation),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recus_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast(`${data.length} reçu(s) exporté(s) en CSV.`, 'success');
  }

  // ── Téléchargement ───────────────────────────────────────────────────────────

  telecharger(recu: Recu): void {
    this.downloadingId = recu.id;
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
          this.showToast(`Reçu ${recu.numero_recu} téléchargé.`, 'success');
        },
        error: async (err) => {
          this.downloadingId = null;
          this.showToast(await this.extractBlobError(err, 'Erreur lors du téléchargement.'), 'error');
        },
      });
  }

  // ── Impression ───────────────────────────────────────────────────────────────

  imprimer(recu: Recu): void {
    this.printingId = recu.id;
    this.http
      .get(`${this.apiUrl}/recus/${recu.id}/download`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 15000);
          this.printingId = null;
        },
        error: async (err) => {
          this.printingId = null;
          this.showToast(await this.extractBlobError(err, 'Impossible d\'ouvrir le PDF.'), 'error');
        },
      });
  }

  // ── Row hover animation ──────────────────────────────────────────────────────

  onRowEnter(event: MouseEvent): void {
    (event.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
  }

  onRowLeave(event: MouseEvent): void {
    (event.currentTarget as HTMLElement).style.transform = 'translateX(0)';
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  initiales(recu: Recu): string {
    return `${(recu.prenom ?? '?')[0]}${(recu.nom ?? '?')[0]}`.toUpperCase();
  }

  formatMontant(montant: number | string): string {
    const n = Math.round(Number(montant));
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  showToast(message: string, type: 'success' | 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => (this.toast = null), 3500);
  }

  // L'erreur d'une requête blob est elle-même un Blob — on la décode en JSON.
  private async extractBlobError(err: { error: unknown }, fallback: string): Promise<string> {
    if (err.error instanceof Blob) {
      try {
        const text = await (err.error as Blob).text();
        const json = JSON.parse(text) as { message?: string };
        return json?.message ?? fallback;
      } catch {
        return fallback;
      }
    }
    return (err.error as { message?: string })?.message ?? fallback;
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Seance {
  id: number;
  date_seance: string;
  type: string;
  theme: string | null;
  lieu: string | null;
  heure: string | null;
  cloturee: boolean;
  description?: string;
}

interface Cotisation {
  id: number;
  membre_id: number;
  nom: string;
  prenom: string;
  montant: number;
  mode_paiement: string;
  statut: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

@Component({
  selector: 'app-detail-seance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './detail-seance.component.html',
})
export class DetailSeanceComponent implements OnInit {
  seanceId: number | null = null;
  seance: Seance | null = null;
  cotisations: Cotisation[] = [];

  isLoading = true;
  errorMessage = '';
  isCloturing = false;
  isDownloading = false;

  searchQuery = '';

  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly apiUrl = environment.apiUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private location: Location,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/seances']); return; }
    this.seanceId = id;
    this.charger();
  }

  retour(): void {
    this.location.back();
  }

  charger(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<{ success: boolean; data: Seance }>(`${this.apiUrl}/seances/${this.seanceId}`).subscribe({
      next: (res) => {
        this.seance = res.success ? res.data : null;
        this.chargerCotisations();
      },
      error: () => {
        this.errorMessage = 'Impossible de charger la séance.';
        this.isLoading = false;
      },
    });
  }

  private chargerCotisations(): void {
    const params = new HttpParams().set('seance_id', String(this.seanceId));
    this.http.get<{ success: boolean; data: Cotisation[] }>(`${this.apiUrl}/cotisations`, { params }).subscribe({
      next: (res) => {
        this.cotisations = res.success ? res.data : [];
        this.isLoading = false;
      },
      error: () => {
        this.cotisations = [];
        this.isLoading = false;
      },
    });
  }

  get cotisationsFiltrees(): Cotisation[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.cotisations;
    return this.cotisations.filter((c) =>
      `${c.prenom} ${c.nom}`.toLowerCase().includes(q),
    );
  }

  get totalMontant(): number {
    return this.cotisations
      .filter((c) => c.statut === 'approved')
      .reduce((sum, c) => sum + Number(c.montant), 0);
  }

  get nbApprouvees(): number {
    return this.cotisations.filter((c) => c.statut === 'approved').length;
  }

  cloturerSeance(): void {
    if (!this.seance || this.seance.cloturee) return;
    this.isCloturing = true;
    this.http.patch<{ success: boolean; data: Seance }>(`${this.apiUrl}/seances/${this.seanceId}/cloturer`, {}).subscribe({
      next: (res) => {
        if (res.success && this.seance) this.seance = { ...this.seance, cloturee: true };
        this.isCloturing = false;
        this.showToast('Séance clôturée avec succès.', 'success');
      },
      error: (err) => {
        this.isCloturing = false;
        this.showToast(err?.error?.message ?? 'Erreur lors de la clôture.', 'error');
      },
    });
  }

  telechargerRecapitulatif(): void {
    this.isDownloading = true;
    this.http
      .get(`${this.apiUrl}/recus/seance/${this.seanceId}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `seance-${this.seanceId}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          this.isDownloading = false;
        },
        error: async (err) => {
          this.isDownloading = false;
          let msg = 'Erreur lors de la génération du PDF.';
          if (err.error instanceof Blob) {
            try { const json = JSON.parse(await err.error.text()); msg = json.message ?? msg; } catch {}
          }
          this.showToast(msg, 'error');
        },
      });
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      hebdomadaire: 'Hebdomadaire', mensuelle: 'Mensuelle', gamou: 'Gamou',
      magal: 'Magal', safar: 'Safar', adiya: 'Adiya', autre: 'Autre',
    };
    return map[type] ?? type;
  }

  modeLabel(mode: string): string {
    const map: Record<string, string> = { especes: 'Espèces', wave: 'Wave', orange_money: 'Orange Money' };
    return map[mode] ?? mode;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  formatMontant(montant: number | string): string {
    const n = Math.round(Number(montant));
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  }

  initiales(c: Cotisation): string {
    return `${(c.prenom ?? '?')[0]}${(c.nom ?? '?')[0]}`.toUpperCase();
  }

  showToast(message: string, type: 'success' | 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => (this.toast = null), 3000);
  }
}

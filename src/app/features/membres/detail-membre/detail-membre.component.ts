import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Membre {
  id: number;
  nom: string;
  prenom: string;
  telephone: string | null;
  photo_url: string | null;
  date_adhesion: string | null;
  responsabilites: string | null;
  actif: boolean;
  created_at: string;
  statut_cotisation: 'a_jour' | 'en_retard';
}

interface Cotisation {
  id: number;
  membre_id: number;
  seance_id: number;
  montant: number;
  mode_paiement: string;
  statut: 'pending' | 'approved' | 'rejected';
  date_seance: string;
  type: string;
  created_at: string;
}

@Component({
  selector: 'app-detail-membre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './detail-membre.component.html',
})
export class DetailMembreComponent implements OnInit {
  membreId: number | null = null;
  membre: Membre | null = null;
  cotisations: Cotisation[] = [];

  isLoading = true;
  isLoadingCotisations = false;
  errorMessage = '';

  activeTab: 'infos' | 'cotisations' = 'infos';

  isExportingFiche = false;
  private readonly apiUrl = environment.apiUrl;
  readonly backendUrl = environment.apiUrl.replace('/api', '');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private location: Location,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/membres']); return; }
    this.membreId = id;
    this.charger();
  }

  retour(): void { this.location.back(); }

  charger(): void {
    this.isLoading = true;
    this.http.get<{ success: boolean; data: Membre }>(`${this.apiUrl}/membres/${this.membreId}`).subscribe({
      next: (res) => {
        this.membre = res.success ? res.data : null;
        this.isLoading = false;
        this.chargerCotisations();
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les données du membre.';
        this.isLoading = false;
      },
    });
  }

  private chargerCotisations(): void {
    this.isLoadingCotisations = true;
    const params = new HttpParams().set('membre_id', String(this.membreId));
    this.http.get<{ success: boolean; data: Cotisation[] }>(`${this.apiUrl}/cotisations`, { params }).subscribe({
      next: (res) => {
        this.cotisations = res.success ? res.data : [];
        this.isLoadingCotisations = false;
      },
      error: () => {
        this.cotisations = [];
        this.isLoadingCotisations = false;
      },
    });
  }

  setTab(tab: 'infos' | 'cotisations'): void {
    this.activeTab = tab;
  }

  exporterFiche(): void {
    if (this.isExportingFiche || !this.membreId) return;
    this.isExportingFiche = true;
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/membres/${this.membreId}/fiche-pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `fiche-${this.membre?.prenom ?? 'membre'}-${this.membre?.nom ?? ''}.pdf`
          .replace(/\s+/g, '-').toLowerCase();
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .finally(() => setTimeout(() => (this.isExportingFiche = false), 1500));
  }

  get initiales(): string {
    if (!this.membre) return '?';
    return `${(this.membre.prenom ?? '?')[0]}${(this.membre.nom ?? '?')[0]}`.toUpperCase();
  }

  get avatarUrl(): string | null {
    const url = this.membre?.photo_url;
    if (!url) return null;
    return url.startsWith('http') ? url : `${this.backendUrl}${url}`;
  }

  get totalApprouvees(): number {
    return this.cotisations
      .filter(c => c.statut === 'approved')
      .reduce((s, c) => s + Number(c.montant), 0);
  }

  get nbApprouvees(): number {
    return this.cotisations.filter(c => c.statut === 'approved').length;
  }

  formatMontant(n: number | string): string {
    return Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  formatTel(t: string | null | undefined): string {
    if (!t) return '—';
    const d = t.replace(/\D/g, '');
    if (d.length !== 9) return t;
    return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
  }

  modeLabel(mode: string): string {
    const m: Record<string, string> = { especes: 'Espèces', wave: 'Wave', orange_money: 'Orange Money' };
    return m[mode] ?? mode;
  }

  typeLabel(type: string): string {
    const m: Record<string, string> = {
      hebdomadaire: 'Hebdomadaire', mensuelle: 'Mensuelle', gamou: 'Gamou',
      magal: 'Magal', safar: 'Safar', adiya: 'Adiya', autre: 'Autre',
    };
    return m[type] ?? type;
  }

  statutClass(statut: string): string {
    switch (statut) {
      case 'approved': return 'bg-secondary/10 text-secondary';
      case 'rejected': return 'bg-error-container text-on-error-container';
      default: return 'bg-surface-container-high text-on-surface-variant';
    }
  }

  statutLabel(statut: string): string {
    switch (statut) {
      case 'approved': return 'Approuvée';
      case 'rejected': return 'Rejetée';
      default: return 'En attente';
    }
  }
}

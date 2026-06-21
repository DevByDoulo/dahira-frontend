import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AnnoncesService, Annonce } from '../../core/services/annonces.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-annonces',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './annonces.component.html',
})
export class AnnoncesComponent implements OnInit, OnDestroy {
  isLoading = true;
  errorMessage = '';
  annonces: Annonce[] = [];
  categorieActive = '';
  searchQuery = '';

  modalSupprimer: Annonce | null = null;
  isActionLoading = false;
  isBureau = false;

  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly categories = [
    { value: '', label: 'Tout' },
    { value: 'bureau', label: 'Administrateur' },
    { value: 'tresorier', label: 'Trésoriers' },
  ];

  constructor(
    private annoncesService: AnnoncesService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const toastMsg = nav?.extras?.state?.['toast'] as string | undefined;
    if (toastMsg) this.showToast(toastMsg, 'success');
    this.isBureau = this.authService.getUser()?.role === 'bureau';
    this.charger();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  charger(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.annoncesService.getAnnonces().subscribe({
      next: (res) => {
        this.annonces = res.success ? res.data : [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les annonces.';
        this.isLoading = false;
      },
    });
  }

  get filtrees(): Annonce[] {
    let result = this.annonces;
    if (this.categorieActive) result = result.filter((a) => a.cible_groupe === this.categorieActive);
    const q = this.searchQuery.trim().toLowerCase();
    if (q) result = result.filter((a) => a.titre.toLowerCase().includes(q) || a.contenu.toLowerCase().includes(q));
    return result;
  }

  setCategorie(c: string): void {
    this.categorieActive = c;
  }

  initiales(a: Annonce): string {
    return (a.publie_par_nom ?? '').substring(0, 2).toUpperCase() || '?';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  ouvrirSupprimer(a: Annonce): void {
    this.modalSupprimer = a;
  }

  fermerModal(): void {
    this.modalSupprimer = null;
    this.isActionLoading = false;
  }

  execSupprimer(): void {
    if (!this.modalSupprimer) return;
    this.isActionLoading = true;
    this.annoncesService.deleteAnnonce(this.modalSupprimer.id).subscribe({
      next: () => {
        this.fermerModal();
        this.showToast('Annonce supprimée.', 'success');
        this.charger();
      },
      error: () => {
        this.showToast('Erreur lors de la suppression.', 'error');
        this.isActionLoading = false;
      },
    });
  }

  showToast(message: string, type: 'success' | 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => (this.toast = null), 3500);
  }
}

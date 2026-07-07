import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  CotisationsService,
  EncaisserCotisationPayload,
  CotisationStats,
} from '../../../core/services/cotisations.service';
import { MembresService, Membre } from '../../../core/services/membres.service';
import { SeancesService, Seance } from '../../../core/services/seances.service';

@Component({
  selector: 'app-encaisser-cotisation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './encaisser-cotisation.component.html',
})
export class EncaisserCotisationComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  membres: Membre[] = [];
  seances: Seance[] = [];
  chargementMembres = true;
  chargementSeances = true;

  stats: CotisationStats | null = null;
  chargementStats = true;

  searchQuery = '';
  showDropdown = false;
  membreSelectionne: Membre | null = null;

  currentDate = '';
  currentTime = '';
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  cotisationSuccessId: number | null = null;

  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly modes: { value: 'especes' | 'wave' | 'orange_money'; label: string; icon: string }[] = [
    { value: 'especes', label: 'Espèces', icon: 'payments' },
    { value: 'wave', label: 'Wave', icon: 'smartphone' },
    { value: 'orange_money', label: 'Orange Money', icon: 'phonelink_ring' },
  ];

  constructor(
    private fb: FormBuilder,
    private cotisationsService: CotisationsService,
    private membresService: MembresService,
    private seancesService: SeancesService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      membre_id: [null, Validators.required],
      seance_id: [null, Validators.required],
      montant: [null, [Validators.required, Validators.min(1)]],
      mode_paiement: ['especes', Validators.required],
      note: [''],
    });
  }

  ngOnInit(): void {
    this.membresService.getMembres().subscribe({
      next: (res) => {
        this.membres = res.success ? res.data : [];
        this.chargementMembres = false;
      },
      error: () => { this.chargementMembres = false; },
    });

    this.seancesService.getSeances({ cloturee: false, limit: 10 }).subscribe({
      next: (res) => {
        this.seances = res.success ? res.data : [];
        this.chargementSeances = false;
      },
      error: () => { this.chargementSeances = false; },
    });

    this.cotisationsService.getStats().subscribe({
      next: (res) => {
        this.stats = res.success ? res.data : null;
        this.chargementStats = false;
      },
      error: () => { this.chargementStats = false; },
    });

    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy(): void {
    if (this.clockTimer) clearInterval(this.clockTimer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  private updateClock(): void {
    const now = new Date();
    this.currentDate = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    this.currentTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  get membresFiltres(): Membre[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.membres.slice(0, 6);
    return this.membres
      .filter((m) => `${m.prenom} ${m.nom}`.toLowerCase().includes(q))
      .slice(0, 6);
  }

  get membresActifs(): number {
    return this.membres.filter((m) => m.actif).length;
  }

  private formatFCFA(n: number): string {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  }

  get montantFormatePreview(): string {
    const v = Number(this.form.get('montant')!.value);
    if (!v || v <= 0) return '';
    return this.formatFCFA(v);
  }

  get totalMensuelFormate(): string {
    if (!this.stats) return '—';
    return this.formatFCFA(this.stats.total_general);
  }

  onSearchInput(): void {
    this.showDropdown = true;
    if (this.membreSelectionne) {
      this.membreSelectionne = null;
      this.form.patchValue({ membre_id: null });
    }
  }

  onSearchBlur(): void {
    setTimeout(() => { this.showDropdown = false; }, 150);
  }

  selectionnerMembre(membre: Membre): void {
    this.membreSelectionne = membre;
    this.searchQuery = `${membre.prenom} ${membre.nom}`;
    this.form.patchValue({ membre_id: membre.id });
    this.showDropdown = false;
  }

  effacerMembre(): void {
    this.membreSelectionne = null;
    this.searchQuery = '';
    this.form.patchValue({ membre_id: null });
  }

  setMode(mode: 'especes' | 'wave' | 'orange_money'): void {
    this.form.patchValue({ mode_paiement: mode });
  }

  formatDateSeance(seance: Seance): string {
    return new Date(seance.date_seance).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  typeSeanceLabel(type: string): string {
    const map: Record<string, string> = { dahira: 'Dahira', mensuelle: 'Mensuelle', autre: 'Autre' };
    return map[type] ?? type;
  }

  showToast(message: string, type: 'success' | 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => { this.toast = null; }, 2500);
  }

  get membre_id() { return this.form.get('membre_id')!; }
  get seance_id() { return this.form.get('seance_id')!; }
  get montant()   { return this.form.get('montant')!; }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = '';

    const raw = this.form.value;
    const payload: EncaisserCotisationPayload = {
      membre_id: raw.membre_id,
      seance_id: Number(raw.seance_id),
      montant: Number(raw.montant),
      mode_paiement: raw.mode_paiement,
      ...(raw.note?.trim() ? { note: raw.note.trim() } : {}),
    };

    this.cotisationsService.encaisserCotisation(payload).subscribe({
      next: (res) => {
        this.cotisationSuccessId = res.data?.id ?? null;
        this.isSubmitting = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur serveur. Veuillez réessayer.';
        this.isSubmitting = false;
      },
    });
  }

  retournerAuxCotisations(): void {
    this.router.navigate(['/cotisations']);
  }

  annuler(): void {
    this.router.navigate(['/cotisations']);
  }
}

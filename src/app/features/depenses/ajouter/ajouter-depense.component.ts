import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DepensesService, CreateDepensePayload } from '../../../core/services/depenses.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-ajouter-depense',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ajouter-depense.component.html',
})
export class AjouterDepenseComponent implements OnDestroy {
  form: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  isUploadingJustificatif = false;
  isDragging = false;
  justificatifNom: string | null = null;
  justificatifEstImage = false;
  justificatifPreviewUrl: string | null = null;
  justificatifErreur = '';

  readonly categories: { value: string; label: string }[] = [
    { value: 'evenements', label: 'Événements' },
    { value: 'location', label: 'Location' },
    { value: 'nourriture', label: 'Nourriture' },
    { value: 'donations', label: 'Donations' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'autres', label: 'Autres' },
  ];

  readonly modesPaiement: { value: string; label: string; icon: string }[] = [
    { value: 'especes', label: 'Espèces', icon: 'payments' },
    { value: 'wave', label: 'Wave', icon: 'smartphone' },
    { value: 'orange_money', label: 'Orange Money', icon: 'phonelink_ring' },
    { value: 'virement', label: 'Virement', icon: 'account_balance' },
    { value: 'cheque', label: 'Chèque', icon: 'receipt' },
  ];

  constructor(
    private fb: FormBuilder,
    private depensesService: DepensesService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(3)]],
      montant: [null, [Validators.required, Validators.min(1)]],
      categorie: ['', Validators.required],
      mode_paiement: ['', Validators.required],
      date_depense: ['', Validators.required],
      justificatif_url: [''],
      note: [''],
    });
  }

  ngOnDestroy(): void {
    if (this.justificatifPreviewUrl) URL.revokeObjectURL(this.justificatifPreviewUrl);
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.handleFile(file);
  }

  onJustificatifChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.handleFile(file);
  }

  private handleFile(file: File): void {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      this.justificatifErreur = 'Format non autorisé. Utilisez JPG, PNG ou PDF.';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.justificatifErreur = 'Le fichier dépasse la limite de 10 Mo.';
      return;
    }
    this.isUploadingJustificatif = true;
    this.justificatifErreur = '';

    if (file.type.startsWith('image/')) {
      if (this.justificatifPreviewUrl) URL.revokeObjectURL(this.justificatifPreviewUrl);
      this.justificatifPreviewUrl = URL.createObjectURL(file);
      this.justificatifEstImage = true;
    } else {
      this.justificatifPreviewUrl = null;
      this.justificatifEstImage = false;
    }

    this.depensesService.uploadJustificatif(file).subscribe({
      next: (res) => {
        this.form.patchValue({ justificatif_url: res.data.url });
        this.justificatifNom = file.name;
        this.isUploadingJustificatif = false;
      },
      error: (err) => {
        this.justificatifErreur = err?.error?.message ?? "Erreur lors de l'envoi du fichier.";
        if (this.justificatifPreviewUrl) {
          URL.revokeObjectURL(this.justificatifPreviewUrl);
          this.justificatifPreviewUrl = null;
        }
        this.isUploadingJustificatif = false;
      },
    });
  }

  clearJustificatif(): void {
    if (this.justificatifPreviewUrl) {
      URL.revokeObjectURL(this.justificatifPreviewUrl);
      this.justificatifPreviewUrl = null;
    }
    this.form.patchValue({ justificatif_url: '' });
    this.justificatifNom = null;
    this.justificatifEstImage = false;
    this.justificatifErreur = '';
  }

  // ── Accesseurs formulaire ───────────────────────────────────────────────────

  get description()   { return this.form.get('description')!; }
  get montant()       { return this.form.get('montant')!; }
  get categorie()     { return this.form.get('categorie')!; }
  get mode_paiement() { return this.form.get('mode_paiement')!; }
  get date_depense()  { return this.form.get('date_depense')!; }

  today(): string {
    return new Date().toISOString().split('T')[0];
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = '';

    const raw = this.form.value;
    const payload: CreateDepensePayload = {
      description: raw.description.trim(),
      montant: Number(raw.montant),
      categorie: raw.categorie,
      mode_paiement: raw.mode_paiement,
      date_depense: raw.date_depense,
      ...(raw.justificatif_url?.trim() ? { justificatif_url: raw.justificatif_url.trim() } : {}),
      ...(raw.note?.trim() ? { note: raw.note.trim() } : {}),
    };

    this.depensesService.createDepense(payload).subscribe({
      next: () => {
        this.router.navigate(['/depenses'], { state: { toast: 'Dépense enregistrée avec succès.' } });
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur serveur. Veuillez réessayer.';
        this.isSubmitting = false;
      },
    });
  }
}

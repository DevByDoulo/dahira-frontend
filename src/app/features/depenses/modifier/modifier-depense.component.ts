import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { DepensesService, UpdateDepensePayload } from '../../../core/services/depenses.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-modifier-depense',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './modifier-depense.component.html',
})
export class ModifierDepenseComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  isUploadingJustificatif = false;
  isDragging = false;
  justificatifNom: string | null = null;
  justificatifEstImage = false;
  justificatifPreviewUrl: string | null = null;
  justificatifErreur = '';
  private depenseId!: number;
  private previewIsBlobUrl = false;

  readonly categories: { value: string; label: string }[] = [
    { value: 'evenements', label: 'Événements' },
    { value: 'location', label: 'Location' },
    { value: 'nourriture', label: 'Nourriture' },
    { value: 'donations', label: 'Donations' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'autres', label: 'Autres' },
  ];

  readonly modesPaiement: { value: string; label: string }[] = [
    { value: 'especes', label: 'Espèces' },
    { value: 'wave', label: 'Wave' },
    { value: 'orange_money', label: 'Orange Money' },
    { value: 'virement', label: 'Virement' },
    { value: 'cheque', label: 'Chèque' },
  ];

  constructor(
    private fb: FormBuilder,
    private depensesService: DepensesService,
    private route: ActivatedRoute,
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

  ngOnInit(): void {
    this.depenseId = Number(this.route.snapshot.paramMap.get('id'));
    this.depensesService.getDepense(this.depenseId).subscribe({
      next: (res) => {
        const d = res.data;
        this.form.patchValue({
          description: d.description,
          montant: d.montant,
          categorie: d.categorie,
          mode_paiement: d.mode_paiement,
          date_depense: d.date_depense.split('T')[0],
          justificatif_url: d.justificatif_url ?? '',
          note: d.note ?? '',
        });
        if (d.justificatif_url) {
          this.justificatifNom = d.justificatif_url.split('/').pop() ?? 'Justificatif existant';
          this.justificatifEstImage = /\.(jpg|jpeg|png)$/i.test(d.justificatif_url);
          if (this.justificatifEstImage) {
            this.justificatifPreviewUrl = `${environment.backendUrl}${d.justificatif_url}`;
            this.previewIsBlobUrl = false;
          }
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger la dépense.';
        this.isLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    if (this.previewIsBlobUrl && this.justificatifPreviewUrl) {
      URL.revokeObjectURL(this.justificatifPreviewUrl);
    }
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
      if (this.previewIsBlobUrl && this.justificatifPreviewUrl) {
        URL.revokeObjectURL(this.justificatifPreviewUrl);
      }
      this.justificatifPreviewUrl = URL.createObjectURL(file);
      this.justificatifEstImage = true;
      this.previewIsBlobUrl = true;
    } else {
      if (this.previewIsBlobUrl && this.justificatifPreviewUrl) {
        URL.revokeObjectURL(this.justificatifPreviewUrl);
      }
      this.justificatifPreviewUrl = null;
      this.justificatifEstImage = false;
      this.previewIsBlobUrl = false;
    }

    this.depensesService.uploadJustificatif(file).subscribe({
      next: (res) => {
        this.form.patchValue({ justificatif_url: res.data.url });
        this.justificatifNom = file.name;
        this.isUploadingJustificatif = false;
      },
      error: (err) => {
        this.justificatifErreur = err?.error?.message ?? "Erreur lors de l'envoi du fichier.";
        if (this.previewIsBlobUrl && this.justificatifPreviewUrl) {
          URL.revokeObjectURL(this.justificatifPreviewUrl);
          this.justificatifPreviewUrl = null;
          this.previewIsBlobUrl = false;
        }
        this.isUploadingJustificatif = false;
      },
    });
  }

  clearJustificatif(): void {
    if (this.previewIsBlobUrl && this.justificatifPreviewUrl) {
      URL.revokeObjectURL(this.justificatifPreviewUrl);
    }
    this.justificatifPreviewUrl = null;
    this.previewIsBlobUrl = false;
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
    const payload: UpdateDepensePayload = {
      description: raw.description.trim(),
      montant: Number(raw.montant),
      categorie: raw.categorie,
      mode_paiement: raw.mode_paiement,
      date_depense: raw.date_depense,
      ...(raw.justificatif_url?.trim() ? { justificatif_url: raw.justificatif_url.trim() } : {}),
      ...(raw.note?.trim() ? { note: raw.note.trim() } : {}),
    };

    this.depensesService.updateDepense(this.depenseId, payload).subscribe({
      next: () => {
        this.router.navigate(['/depenses'], { state: { toast: 'Dépense modifiée avec succès.' } });
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur serveur. Veuillez réessayer.';
        this.isSubmitting = false;
      },
    });
  }
}

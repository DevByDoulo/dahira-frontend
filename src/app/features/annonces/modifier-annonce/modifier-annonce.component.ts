import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AnnoncesService } from '../../../core/services/annonces.service';

type RecorderState = 'idle' | 'requesting' | 'recording' | 'recorded' | 'uploading';

@Component({
  selector: 'app-modifier-annonce',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modifier-annonce.component.html',
})
export class ModifierAnnonceComponent implements OnInit, OnDestroy {
  annonceId!: number;

  titre = '';
  contenu = '';
  categorie = '';
  cible: 'tous' | 'secretaire_general' | 'responsable_org' = 'tous';

  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  validationErrors: string[] = [];

  // Audio existant chargé depuis l'API
  currentAudioUrl: string | null = null;
  deleteExistingAudio = false;

  // Enregistreur vocal
  recorderState: RecorderState = 'idle';
  recordingSeconds = 0;
  audioBlob: Blob | null = null;
  audioBlobUrl: string | null = null;
  uploadedAudioUrl: string | null = null;
  previewPlaying = false;
  previewCurrentTime = 0;
  previewDuration = 0;
  existingPlaying = false;
  existingCurrentTime = 0;
  existingDuration = 0;
  micError = '';

  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: BlobPart[] = [];
  private recordingInterval: ReturnType<typeof setInterval> | null = null;

  get isRecorderSupported(): boolean {
    return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  get effectiveAudioUrl(): string | null {
    if (this.deleteExistingAudio) return null;
    if (this.uploadedAudioUrl) return this.uploadedAudioUrl;
    return this.currentAudioUrl;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private annoncesService: AnnoncesService,
  ) {}

  ngOnInit(): void {
    this.annonceId = Number(this.route.snapshot.paramMap.get('id'));
    this.annoncesService.getAnnonce(this.annonceId).subscribe({
      next: (res) => {
        if (!res.success) {
          this.router.navigate(['/annonces']);
          return;
        }
        const a = res.data;
        this.titre = a.titre;
        this.contenu = a.contenu;
        this.cible = (a.cible_groupe as 'tous' | 'secretaire_general' | 'responsable_org') ?? 'tous';
        this.currentAudioUrl = a.audio_url;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = "Impossible de charger l'annonce.";
        this.isLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.cleanupRecorder();
    if (this.audioBlobUrl) URL.revokeObjectURL(this.audioBlobUrl);
  }

  // ── Gestion audio existant ────────────────────────────────────────────────

  onExistingLoaded(el: HTMLAudioElement): void {
    this.existingDuration = isNaN(el.duration) ? 0 : el.duration;
  }

  onExistingTimeUpdate(el: HTMLAudioElement): void {
    this.existingCurrentTime = el.currentTime;
  }

  onExistingEnded(el: HTMLAudioElement): void {
    this.existingPlaying = false;
    this.existingCurrentTime = 0;
    el.currentTime = 0;
  }

  toggleExisting(el: HTMLAudioElement): void {
    if (this.existingPlaying) {
      el.pause();
      this.existingPlaying = false;
    } else {
      el.play().catch(() => {});
      this.existingPlaying = true;
    }
  }

  seekExisting(el: HTMLAudioElement, event: MouseEvent): void {
    if (!el.duration) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    el.currentTime = ((event.clientX - rect.left) / rect.width) * el.duration;
  }

  removeExistingAudio(): void {
    this.deleteExistingAudio = true;
  }

  // ── Enregistreur ──────────────────────────────────────────────────────────

  startRecording(): void {
    this.recorderState = 'requesting';
    this.micError = '';
    // Si on enregistre un nouveau, on annule la suppression de l'existant
    this.deleteExistingAudio = false;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.mediaStream = stream;
        const mimeType = this.getSupportedMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        this.mediaRecorder = recorder;
        this.audioChunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.audioChunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(this.audioChunks, { type: recorder.mimeType || 'audio/webm' });
          this.audioBlob = blob;
          if (this.audioBlobUrl) URL.revokeObjectURL(this.audioBlobUrl);
          this.audioBlobUrl = URL.createObjectURL(blob);
          this.previewCurrentTime = 0;
          this.previewDuration = 0;
          this.previewPlaying = false;
          this.recorderState = 'recorded';
        };

        recorder.start(250);
        this.recorderState = 'recording';
        this.recordingSeconds = 0;

        this.recordingInterval = setInterval(() => {
          this.recordingSeconds++;
          if (this.recordingSeconds >= 300) this.stopRecording();
        }, 1000);
      })
      .catch((err: DOMException) => {
        this.recorderState = 'idle';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          this.micError =
            "Accès au microphone refusé. Autorisez l'accès dans les paramètres du navigateur.";
        } else if (err.name === 'NotFoundError') {
          this.micError = 'Aucun microphone détecté sur cet appareil.';
        } else {
          this.micError = "Impossible d'accéder au microphone.";
        }
      });
  }

  stopRecording(): void {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }

  reRecord(): void {
    this.cleanupRecorder();
    if (this.audioBlobUrl) {
      URL.revokeObjectURL(this.audioBlobUrl);
      this.audioBlobUrl = null;
    }
    this.audioBlob = null;
    this.uploadedAudioUrl = null;
    this.recorderState = 'idle';
    this.recordingSeconds = 0;
    this.micError = '';
  }

  private cleanupRecorder(): void {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }

  private getSupportedMimeType(): string {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
  }

  formatRecordingTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  formatAudioTime(seconds: number): string {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── Prévisualisation nouveau ──────────────────────────────────────────────

  onPreviewLoaded(el: HTMLAudioElement): void {
    this.previewDuration = isNaN(el.duration) ? 0 : el.duration;
  }

  onPreviewTimeUpdate(el: HTMLAudioElement): void {
    this.previewCurrentTime = el.currentTime;
  }

  onPreviewEnded(el: HTMLAudioElement): void {
    this.previewPlaying = false;
    this.previewCurrentTime = 0;
    el.currentTime = 0;
  }

  togglePreview(el: HTMLAudioElement): void {
    if (this.previewPlaying) {
      el.pause();
      this.previewPlaying = false;
    } else {
      el.play().catch(() => {});
      this.previewPlaying = true;
    }
  }

  seekPreview(el: HTMLAudioElement, event: MouseEvent): void {
    if (!el.duration) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    el.currentTime = ((event.clientX - rect.left) / rect.width) * el.duration;
  }

  // ── Formulaire ────────────────────────────────────────────────────────────

  cyclerCible(): void {
    const cycle: (typeof this.cible)[] = ['tous', 'secretaire_general', 'responsable_org'];
    this.cible = cycle[(cycle.indexOf(this.cible) + 1) % cycle.length];
  }

  soumettre(): void {
    this.validationErrors = [];
    if (!this.titre.trim()) this.validationErrors.push('Le titre est obligatoire.');
    if (!this.contenu.trim()) this.validationErrors.push('Le contenu est obligatoire.');
    if (this.validationErrors.length > 0) return;
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    if (this.audioBlob && !this.uploadedAudioUrl) {
      this.recorderState = 'uploading';
      const ext = this.getAudioExtension(this.audioBlob.type);
      const formData = new FormData();
      formData.append('audio', this.audioBlob, `message-vocal.${ext}`);
      this.annoncesService.uploadAudio(formData).subscribe({
        next: (res) => {
          this.uploadedAudioUrl = res.data.url;
          this.recorderState = 'recorded';
          this.enregistrerAnnonce();
        },
        error: () => {
          this.recorderState = 'recorded';
          this.errorMessage = "Erreur lors de l'envoi du message vocal.";
          this.isSubmitting = false;
        },
      });
    } else {
      this.enregistrerAnnonce();
    }
  }

  private enregistrerAnnonce(): void {
    const payload = {
      titre: this.titre.trim(),
      contenu: this.contenu.trim(),
      cible_groupe: this.cible,
      audio_url: this.effectiveAudioUrl,
    };

    this.annoncesService.updateAnnonce(this.annonceId, payload).subscribe({
      next: () => {
        if (this.audioBlobUrl) URL.revokeObjectURL(this.audioBlobUrl);
        this.router.navigate(['/annonces'], { state: { toast: 'Annonce modifiée avec succès.' } });
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur lors de la modification.';
        this.isSubmitting = false;
      },
    });
  }

  private getAudioExtension(mimeType: string): string {
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'mp4';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'webm';
  }

  annuler(): void {
    this.router.navigate(['/annonces']);
  }
}

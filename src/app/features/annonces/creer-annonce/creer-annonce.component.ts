import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AnnoncesService, CreateAnnoncePayload } from '../../../core/services/annonces.service';

type RecorderState = 'idle' | 'requesting' | 'recording' | 'recorded' | 'uploading';

@Component({
  selector: 'app-creer-annonce',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creer-annonce.component.html',
})
export class CreerAnnonceComponent implements OnDestroy {
  titre = '';
  contenu = '';
  categorie = '';
  epingler = false;
  cible: 'tous' | 'secretaire_general' | 'responsable_org' = 'tous';
  selectedFile: File | null = null;
  selectedFileName = '';

  isLoading = false;
  errorMessage = '';
  validationErrors: string[] = [];

  // Enregistreur vocal
  recorderState: RecorderState = 'idle';
  recordingSeconds = 0;
  audioBlob: Blob | null = null;
  audioBlobUrl: string | null = null;
  uploadedAudioUrl: string | null = null;
  previewPlaying = false;
  previewCurrentTime = 0;
  previewDuration = 0;
  micError = '';

  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: BlobPart[] = [];
  private recordingInterval: ReturnType<typeof setInterval> | null = null;

  get isRecorderSupported(): boolean {
    return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  constructor(
    private annoncesService: AnnoncesService,
    private router: Router,
  ) {}

  ngOnDestroy(): void {
    this.cleanupRecorder();
    if (this.audioBlobUrl) URL.revokeObjectURL(this.audioBlobUrl);
  }

  // ── Enregistreur ──────────────────────────────────────────────────────────

  startRecording(): void {
    this.recorderState = 'requesting';
    this.micError = '';

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

  // ── Prévisualisation ──────────────────────────────────────────────────────

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

  soumettre(): void {
    this.validationErrors = [];
    if (!this.titre.trim()) this.validationErrors.push('Le titre est obligatoire.');
    if (!this.contenu.trim()) this.validationErrors.push('Le contenu est obligatoire.');
    if (this.validationErrors.length > 0) return;
    if (this.isLoading) return;

    this.isLoading = true;
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
          this.publierAnnonce();
        },
        error: () => {
          this.recorderState = 'recorded';
          this.errorMessage = "Erreur lors de l'envoi du message vocal.";
          this.isLoading = false;
        },
      });
    } else {
      this.publierAnnonce();
    }
  }

  private publierAnnonce(): void {
    const payload: CreateAnnoncePayload = {
      titre: this.titre.trim(),
      contenu: this.contenu.trim(),
      cible_groupe: this.cible !== 'tous' ? this.cible : undefined,
      audio_url: this.uploadedAudioUrl ?? undefined,
    };
    if (this.categorie) payload.categorie = this.categorie;

    this.annoncesService.createAnnonce(payload).subscribe({
      next: () => {
        if (this.audioBlobUrl) URL.revokeObjectURL(this.audioBlobUrl);
        this.router.navigate(['/annonces'], { state: { toast: 'Annonce publiée avec succès.' } });
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur lors de la publication.';
        this.isLoading = false;
      },
    });
  }

  private getAudioExtension(mimeType: string): string {
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'mp4';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'webm';
  }

  cyclerCible(): void {
    const cycle: (typeof this.cible)[] = ['tous', 'secretaire_general', 'responsable_org'];
    this.cible = cycle[(cycle.indexOf(this.cible) + 1) % cycle.length];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.selectedFileName = input.files[0].name;
    }
  }

  annuler(): void {
    this.router.navigate(['/annonces']);
  }
}

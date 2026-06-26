import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PhotosService } from '../../../core/services/photos.service';
import { EvenementsService, Evenement } from '../../../core/services/evenements.service';

@Component({
  selector: 'app-ajouter-photo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ajouter-photo.component.html',
})
export class AjouterPhotoComponent implements OnInit {
  evenements: Evenement[] = [];
  selectedEvenementId: number | null = null;
  titre = '';
  description = '';

  selectedFiles: File[] = [];
  previews: string[] = [];

  isDragOver = false;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private photosService: PhotosService,
    private evenementsService: EvenementsService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.evenementsService.getEvenements().subscribe({
      next: (res) => { this.evenements = res.success ? res.data : []; },
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.ajouterFichiers(Array.from(input.files));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(): void {
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    if (event.dataTransfer?.files) this.ajouterFichiers(Array.from(event.dataTransfer.files));
  }

  ajouterFichiers(files: File[]): void {
    const MAX_SIZE = 50 * 1024 * 1024;
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const tooLarge = imageFiles.filter(f => f.size > MAX_SIZE);
    if (tooLarge.length > 0) {
      this.errorMessage = `${tooLarge.length} fichier(s) dépassent 50 Mo et ont été ignorés.`;
    }
    const valides = imageFiles.filter(f => f.size <= MAX_SIZE);
    const toAdd = valides;
    toAdd.forEach(f => {
      this.selectedFiles.push(f);
      const reader = new FileReader();
      reader.onload = (e) => this.previews.push(e.target!.result as string);
      reader.readAsDataURL(f);
    });
  }

  retirerFichier(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previews.splice(index, 1);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1048576).toFixed(1)} Mo`;
  }

  soumettre(): void {
    if (this.selectedFiles.length === 0) {
      this.errorMessage = 'Veuillez sélectionner au moins une photo.';
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = '';
    this.photosService
      .uploadPhotos(
        this.selectedFiles,
        this.selectedEvenementId,
        this.titre || undefined,
        this.description || undefined,
      )
      .subscribe({
        next: () => this.router.navigate(['/photos']),
        error: (err) => {
          console.error('Upload error:', err);
          if (err.status === 0) {
            this.errorMessage = 'Impossible de joindre le serveur. Vérifiez que le backend tourne sur le port 3000.';
          } else if (err.status === 403) {
            this.errorMessage = 'Accès refusé. Rôle Administrateur requis.';
          } else if (err.status === 413) {
            this.errorMessage = 'Fichiers trop volumineux. Limitez à 5 Mo par photo.';
          } else {
            this.errorMessage = err?.error?.message ?? `Erreur ${err.status} lors de l'upload.`;
          }
          this.isSubmitting = false;
        },
      });
  }
}

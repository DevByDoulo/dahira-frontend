import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PhotosService, Photo } from '../../core/services/photos.service';
import { AuthService } from '../../core/services/auth.service';

interface EvenementGroup {
  id: number;
  titre: string;
  lieu: string | null;
  photos: Photo[];
}

@Component({
  selector: 'app-photos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './photos.component.html',
})
export class PhotosComponent implements OnInit {
  isLoading = true;
  photos: Photo[] = [];
  errorMessage = '';
  lightbox: Photo | null = null;
  modalSupprimer: Photo | null = null;
  isBureau = false;

  private expandedGroupes = new Set<number>();
  readonly backendUrl: string;

  constructor(
    private photosService: PhotosService,
    private authService: AuthService,
  ) {
    this.backendUrl = photosService.backendUrl;
  }

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.isBureau = (user?.role === 'secretaire_general' || user?.role === 'adjoint');
    this.charger();
  }

  charger(): void {
    this.isLoading = true;
    this.photosService.getPhotos().subscribe({
      next: (res) => {
        this.photos = res.success ? res.data : [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les photos.';
        this.isLoading = false;
      },
    });
  }

  get evenementsUniques(): EvenementGroup[] {
    const map = new Map<number, EvenementGroup>();
    this.photos
      .filter(p => p.evenement_id !== null)
      .forEach(p => {
        const id = p.evenement_id!;
        if (!map.has(id)) {
          map.set(id, {
            id,
            titre: p.evenement_titre ?? 'Événement',
            lieu: p.evenement_lieu ?? null,
            photos: [],
          });
        }
        map.get(id)!.photos.push(p);
      });
    return Array.from(map.values());
  }

  get photosSansEvenement(): Photo[] {
    return this.photos.filter(p => p.evenement_id === null);
  }

  get photosFeatures(): Photo[] {
    return this.photos.slice(0, 3);
  }

  photosVisibles(groupe: EvenementGroup): Photo[] {
    return this.expandedGroupes.has(groupe.id) ? groupe.photos : groupe.photos.slice(0, 4);
  }

  groupeExpanded(id: number): boolean {
    return this.expandedGroupes.has(id);
  }

  toggleGroupe(id: number): void {
    if (this.expandedGroupes.has(id)) {
      this.expandedGroupes.delete(id);
    } else {
      this.expandedGroupes.add(id);
    }
  }

  ouvrirLightbox(p: Photo): void {
    this.lightbox = p;
  }

  fermerLightbox(): void {
    this.lightbox = null;
  }

  confirmerSupprimer(p: Photo, event: Event): void {
    event.stopPropagation();
    this.modalSupprimer = p;
  }

  supprimer(): void {
    if (!this.modalSupprimer) return;
    const id = this.modalSupprimer.id;
    this.modalSupprimer = null;
    this.photosService.deletePhoto(id).subscribe({
      next: () => { this.photos = this.photos.filter(p => p.id !== id); },
    });
  }

  imageUrl(url: string): string {
    return url.startsWith('http') ? url : `${this.backendUrl}${url}`;
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.lightbox) { this.lightbox = null; return; }
    if (this.modalSupprimer) { this.modalSupprimer = null; }
  }
}


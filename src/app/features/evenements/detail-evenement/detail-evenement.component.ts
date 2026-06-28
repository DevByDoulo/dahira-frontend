import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EvenementsService, Evenement } from '../../../core/services/evenements.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-detail-evenement',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './detail-evenement.component.html',
})
export class DetailEvenementComponent implements OnInit {
  evenement: Evenement | null = null;

  isLoading = true;
  errorMessage = '';

  isBureau = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private evenementsService: EvenementsService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.isBureau = this.authService.getUser()?.role === 'bureau';
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.charger(id);
  }

  charger(id: number): void {
    this.isLoading = true;
    this.evenementsService.getEvenement(id).subscribe({
      next: (res) => {
        this.evenement = res.success ? res.data : null;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger cet événement.';
        this.isLoading = false;
      },
    });
  }

  statutCalcule(): 'a_venir' | 'passe' {
    if (!this.evenement) return 'passe';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(this.evenement.date_debut) >= today ? 'a_venir' : 'passe';
  }

  photoUrl(): string {
    if (!this.evenement?.image_url) return '';
    if (this.evenement.image_url.startsWith('http')) return this.evenement.image_url;
    return `${environment.backendUrl}${this.evenement.image_url}`;
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  mapsUrl(): string {
    return `https://maps.google.com/?q=${encodeURIComponent(this.evenement?.lieu ?? '')}`;
  }

  retour(): void {
    this.router.navigate(['/evenements']);
  }
}

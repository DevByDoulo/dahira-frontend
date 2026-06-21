import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NotificationsService,
  Notification,
} from '../../core/services/notifications.service';

type Onglet = 'toutes' | 'paiements' | 'evenements' | 'annonces';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit {
  isLoading = true;
  notifications: Notification[] = [];
  unread = 0;
  errorMessage = '';
  ongletActif: Onglet = 'toutes';

  private readonly typesPaiements = ['cotisation_retard', 'validation_cotisation'];
  private readonly typesEvenements = ['evenement_ajoute', 'seance_rappel'];
  private readonly typesAnnonces = ['nouvelle_annonce', 'message_bureau', 'invitation_acceptee'];

  constructor(private notificationsService: NotificationsService) {}

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.isLoading = true;
    this.notificationsService.getNotifications().subscribe({
      next: (res) => {
        if (res.success) {
          this.notifications = res.data.notifications;
          this.unread = res.data.unread;
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les notifications.';
        this.isLoading = false;
      },
    });
  }

  setOnglet(o: Onglet): void {
    this.ongletActif = o;
  }

  get filtrees(): Notification[] {
    switch (this.ongletActif) {
      case 'paiements': return this.notifications.filter(n => this.typesPaiements.includes(n.type));
      case 'evenements': return this.notifications.filter(n => this.typesEvenements.includes(n.type));
      case 'annonces': return this.notifications.filter(n => this.typesAnnonces.includes(n.type));
      default: return this.notifications;
    }
  }

  compteOnglet(o: Onglet): number {
    switch (o) {
      case 'paiements': return this.notifications.filter(n => this.typesPaiements.includes(n.type)).length;
      case 'evenements': return this.notifications.filter(n => this.typesEvenements.includes(n.type)).length;
      case 'annonces': return this.notifications.filter(n => this.typesAnnonces.includes(n.type)).length;
      default: return this.notifications.length;
    }
  }

  marquerLu(n: Notification): void {
    if (n.is_read) return;
    this.notificationsService.markAsRead(n.id).subscribe({
      next: () => {
        n.is_read = true;
        this.unread = Math.max(0, this.unread - 1);
      },
    });
  }

  toutMarquerLu(): void {
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => (n.is_read = true));
        this.unread = 0;
      },
    });
  }

  supprimer(n: Notification, event: Event): void {
    event.stopPropagation();
    this.notificationsService.delete(n.id).subscribe({
      next: () => {
        if (!n.is_read) this.unread = Math.max(0, this.unread - 1);
        this.notifications = this.notifications.filter(x => x.id !== n.id);
      },
    });
  }

  icone(type: string): string {
    const map: Record<string, string> = {
      cotisation_retard: 'warning',
      validation_cotisation: 'check_circle',
      evenement_ajoute: 'event',
      seance_rappel: 'event_repeat',
      nouvelle_annonce: 'campaign',
      message_bureau: 'mark_chat_read',
      invitation_acceptee: 'person_add',
    };
    return map[type] ?? 'notifications';
  }

  iconeBgClass(n: Notification): string {
    if (this.typesPaiements.includes(n.type)) {
      return n.type === 'cotisation_retard'
        ? 'bg-error-container text-on-error-container'
        : 'bg-secondary-container text-on-secondary-container';
    }
    if (this.typesEvenements.includes(n.type)) return 'bg-primary/10 text-primary';
    return 'bg-surface-container text-on-surface-variant';
  }

  tempsRelatif(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "À l'instant";
    if (min < 60) return `Il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Il y a ${h}h`;
    const j = Math.floor(h / 24);
    if (j < 7) return `Il y a ${j}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
}

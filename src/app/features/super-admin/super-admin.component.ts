import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperAdminService, PlatformStats, DahiraAdmin } from '../../core/services/super-admin.service';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './super-admin.component.html',
})
export class SuperAdminComponent implements OnInit {
  isLoadingStats = true;
  isLoadingDahiras = true;
  stats: PlatformStats | null = null;
  dahiras: DahiraAdmin[] = [];
  togglingId: number | null = null;
  toast = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor(private adminService: SuperAdminService) {}

  ngOnInit(): void {
    this.adminService.getStats().subscribe({
      next: (res) => { if (res.success) this.stats = res.data; this.isLoadingStats = false; },
      error: () => { this.isLoadingStats = false; },
    });

    this.adminService.getDahiras().subscribe({
      next: (res) => { if (res.success) this.dahiras = res.data; this.isLoadingDahiras = false; },
      error: () => { this.isLoadingDahiras = false; },
    });
  }

  toggle(dahira: DahiraAdmin): void {
    this.togglingId = dahira.id;
    this.adminService.toggleDahira(dahira.id).subscribe({
      next: (res) => {
        if (res.success) {
          dahira.actif = res.data.actif;
          if (this.stats) {
            this.stats.dahiras_actifs += res.data.actif ? 1 : -1;
            this.stats.dahiras_inactifs += res.data.actif ? -1 : 1;
          }
          this.showToast(res.message, 'success');
        }
        this.togglingId = null;
      },
      error: (err) => {
        this.showToast(err?.error?.message ?? 'Erreur lors de la mise à jour', 'error');
        this.togglingId = null;
      },
    });
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = msg;
    this.toastType = type;
    this.toastTimer = setTimeout(() => { this.toast = ''; }, 3500);
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}

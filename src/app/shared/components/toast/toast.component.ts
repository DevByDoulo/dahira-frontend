import { Component } from '@angular/core';
import { ToastService, ToastType } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
})
export class ToastComponent {
  constructor(readonly toastService: ToastService) {}

  bgClass(type: ToastType): string {
    switch (type) {
      case 'success': return 'bg-secondary-container text-on-secondary-container border-secondary/30';
      case 'error':   return 'bg-error-container text-on-error-container border-error/30';
      case 'warning': return 'bg-[#fff8e1] text-[#5d4037] border-[#f9a825]/30';
      default:        return 'bg-surface-container-high text-on-surface border-outline-variant/30';
    }
  }

  icon(type: ToastType): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error':   return 'error';
      case 'warning': return 'warning';
      default:        return 'info';
    }
  }
}

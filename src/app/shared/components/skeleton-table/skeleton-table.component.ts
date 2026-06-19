import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-table',
  standalone: true,
  template: `
    <div class="p-10 space-y-4 max-w-7xl mx-auto">
      <div class="h-8 w-64 bg-surface-container rounded-xl animate-pulse"></div>
      <div class="bg-surface-container-lowest rounded-xl h-16 animate-pulse"></div>
      @for (_ of rows; track $index) {
        <div class="bg-surface-container-lowest rounded-xl h-16 animate-pulse"></div>
      }
    </div>
  `,
})
export class SkeletonTableComponent {
  @Input() count = 5;
  get rows() { return Array(this.count); }
}

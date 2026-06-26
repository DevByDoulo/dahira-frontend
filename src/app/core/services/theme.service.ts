import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'dahira-theme';

  readonly isDark = signal(false);

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved !== null ? saved === 'dark' : prefersDark;
    this.applyTheme(dark);
  }

  toggle(): void {
    this.applyTheme(!this.isDark());
  }

  private applyTheme(dark: boolean): void {
    this.isDark.set(dark);
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(this.STORAGE_KEY, dark ? 'dark' : 'light');
  }
}

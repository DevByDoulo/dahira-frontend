import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PlatformStats {
  total_dahiras: number;
  dahiras_actifs: number;
  dahiras_inactifs: number;
  total_users: number;
}

export interface DahiraAdmin {
  id: number;
  nom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  actif: boolean;
  created_at: string;
  total_membres: number;
  total_users: number;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly api = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<{ success: boolean; data: PlatformStats }> {
    return this.http.get<{ success: boolean; data: PlatformStats }>(`${this.api}/stats`);
  }

  getDahiras(): Observable<{ success: boolean; data: DahiraAdmin[] }> {
    return this.http.get<{ success: boolean; data: DahiraAdmin[] }>(`${this.api}/dahiras`);
  }

  toggleDahira(id: number): Observable<{ success: boolean; data: { actif: boolean }; message: string }> {
    return this.http.patch<{ success: boolean; data: { actif: boolean }; message: string }>(
      `${this.api}/dahiras/${id}/toggle`,
      {}
    );
  }
}

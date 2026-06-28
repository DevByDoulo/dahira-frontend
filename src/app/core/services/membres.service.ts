import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Membre {
  id: number;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  telephone_secours: string | null;
  email: string | null;
  photo_url: string | null;
  thumbnail_url: string | null;
  date_adhesion: string | null;
  responsabilites: string | null;
  role: 'bureau' | 'tresorier' | 'responsable_org' | 'membre';
  is_owner: boolean;
  actif: boolean;
  a_compte: boolean;
  created_at: string;
  statut_cotisation?: 'a_jour' | 'en_retard';
  total_cotise?: number;
  cotise_ce_mois?: number;
}

export interface CreateMembrePayload {
  nom: string;
  prenom?: string;
  telephone?: string;
  telephone_secours?: string;
  email?: string;
  date_adhesion?: string;
  responsabilites?: string;
  role?: string;
  password?: string;
}

export interface UpdateRolePayload {
  role: 'bureau' | 'tresorier' | 'responsable_org' | 'membre';
}

export interface MembreResponse {
  success: boolean;
  data: Membre;
}

export interface MembresResponse {
  success: boolean;
  data: Membre[];
}

@Injectable({ providedIn: 'root' })
export class MembresService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMembres(): Observable<MembresResponse> {
    return this.http.get<MembresResponse>(`${this.apiUrl}/membres`);
  }

  getMembre(id: number): Observable<MembreResponse> {
    return this.http.get<MembreResponse>(`${this.apiUrl}/membres/${id}`);
  }

  createMembre(payload: CreateMembrePayload): Observable<MembreResponse> {
    return this.http.post<MembreResponse>(`${this.apiUrl}/membres`, payload);
  }

  updateMembre(id: number, payload: Partial<CreateMembrePayload>): Observable<MembreResponse> {
    return this.http.put<MembreResponse>(`${this.apiUrl}/membres/${id}`, payload);
  }

  updateRole(id: number, role: string): Observable<MembreResponse> {
    return this.http.patch<MembreResponse>(`${this.apiUrl}/membres/${id}/role`, { role });
  }

  activerMembre(id: number): Observable<MembreResponse> {
    return this.http.patch<MembreResponse>(`${this.apiUrl}/membres/${id}/activer`, {});
  }

  desactiverMembre(id: number): Observable<MembreResponse> {
    return this.http.patch<MembreResponse>(`${this.apiUrl}/membres/${id}/desactiver`, {});
  }

  uploadPhoto(membreId: number, file: File): Observable<{ success: boolean; data: { photo_url: string; thumbnail_url: string } }> {
    const fd = new FormData();
    fd.append('photo', file);
    return this.http.post<{ success: boolean; data: { photo_url: string; thumbnail_url: string } }>(
      `${this.apiUrl}/membres/${membreId}/photo`,
      fd,
    );
  }
}

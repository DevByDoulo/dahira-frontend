import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Membre {
  id: number;
  nom: string;
  prenom: string;
  telephone: string | null;
  telephone_secours: string | null;
  photo_url: string | null;
  date_adhesion: string | null;
  responsabilites: string | null;
  actif: boolean;
  created_at: string;
  statut_cotisation: 'a_jour' | 'en_retard';
}

export interface CreateMembrePayload {
  nom: string;
  prenom: string;
  telephone?: string;
  telephone_secours?: string;
  photo_url?: string;
  date_adhesion?: string;
  responsabilites?: string;
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

  updateMembre(id: number, payload: CreateMembrePayload): Observable<MembreResponse> {
    return this.http.put<MembreResponse>(`${this.apiUrl}/membres/${id}`, payload);
  }

  createMembre(payload: CreateMembrePayload): Observable<MembreResponse> {
    return this.http.post<MembreResponse>(`${this.apiUrl}/membres`, payload);
  }

  desactiverMembre(id: number): Observable<MembreResponse> {
    return this.http.patch<MembreResponse>(`${this.apiUrl}/membres/${id}/desactiver`, {});
  }

  uploadPhoto(membreId: number, file: File): Observable<{ success: boolean; data: { photo_url: string } }> {
    const fd = new FormData();
    fd.append('photo', file);
    return this.http.post<{ success: boolean; data: { photo_url: string } }>(
      `${this.apiUrl}/photos/membres/${membreId}`,
      fd,
    );
  }
}

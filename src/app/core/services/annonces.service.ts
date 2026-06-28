import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Annonce {
  id: number;
  dahira_id: number;
  titre: string;
  contenu: string;
  image_url: string | null;
  cible_groupe: string | null;
  epinglee: boolean;
  publie_par: number;
  publie_par_nom?: string;
  created_at: string;
}

export interface AnnonceResponse {
  success: boolean;
  data: Annonce;
}

export interface AnnoncesResponse {
  success: boolean;
  data: Annonce[];
}

export interface CreateAnnoncePayload {
  titre: string;
  contenu: string;
  image_url?: string;
  cible_groupe?: string;
  categorie?: string;
}

@Injectable({ providedIn: 'root' })
export class AnnoncesService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAnnonces(): Observable<AnnoncesResponse> {
    return this.http.get<AnnoncesResponse>(`${this.apiUrl}/annonces`);
  }

  getAnnonce(id: number): Observable<AnnonceResponse> {
    return this.http.get<AnnonceResponse>(`${this.apiUrl}/annonces/${id}`);
  }

  createAnnonce(payload: CreateAnnoncePayload): Observable<AnnonceResponse> {
    return this.http.post<AnnonceResponse>(`${this.apiUrl}/annonces`, payload);
  }

  updateAnnonce(id: number, payload: Partial<CreateAnnoncePayload>): Observable<AnnonceResponse> {
    return this.http.put<AnnonceResponse>(`${this.apiUrl}/annonces/${id}`, payload);
  }

  deleteAnnonce(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/annonces/${id}`);
  }
}

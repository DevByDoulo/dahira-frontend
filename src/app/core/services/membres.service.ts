import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

export interface MembresResponse {
  success: boolean;
  data: Membre[];
}

@Injectable({ providedIn: 'root' })
export class MembresService {
  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getMembres(): Observable<MembresResponse> {
    return this.http.get<MembresResponse>(`${this.apiUrl}/membres`);
  }
}

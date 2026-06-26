import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Photo {
  id: number;
  dahira_id: number;
  evenement_id: number | null;
  titre: string | null;
  description: string | null;
  fichier_url: string;
  thumbnail_url: string | null;
  uploaded_by: number;
  evenement_titre: string | null;
  evenement_lieu: string | null;
  date_evenement: string | null;
  uploader_nom: string | null;
  created_at: string;
}

export interface PhotosResponse {
  success: boolean;
  data: Photo[];
}

@Injectable({ providedIn: 'root' })
export class PhotosService {
  private readonly apiUrl = environment.apiUrl;
  readonly backendUrl = environment.backendUrl;

  constructor(private http: HttpClient) {}

  getPhotos(): Observable<PhotosResponse> {
    return this.http.get<PhotosResponse>(`${this.apiUrl}/photos`);
  }

  uploadPhotos(
    files: File[],
    evenementId?: number | null,
    titre?: string,
    description?: string,
  ): Observable<{ success: boolean; data: Photo[] }> {
    const fd = new FormData();
    files.forEach(f => fd.append('photos', f));
    if (evenementId) fd.append('evenement_id', String(evenementId));
    if (titre) fd.append('titre', titre);
    if (description) fd.append('description', description);
    return this.http.post<{ success: boolean; data: Photo[] }>(`${this.apiUrl}/photos`, fd);
  }

  deletePhoto(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/photos/${id}`);
  }
}

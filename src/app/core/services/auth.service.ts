import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: number;
  dahira_id: number | null;
  membre_id: number | null;
  nom: string;
  telephone: string | null;
  email: string | null;
  role: string;
  actif: boolean;
  photo_url: string | null;
  created_at: string;
}

export interface LoginRequest {
  telephone: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: number;
      nom: string;
      prenom: string;
      email: string;
      role: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  private profileSubject = new BehaviorSubject<UserProfile | null>(null);
  profile$ = this.profileSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.success) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.profileSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  getMe(): Observable<{ success: boolean; data: UserProfile }> {
    return this.http.get<{ success: boolean; data: UserProfile }>(`${this.apiUrl}/auth/me`).pipe(
      tap(res => {
        if (res.success) {
          this.profileSubject.next(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        }
      })
    );
  }

  setPhotoUrl(photoUrl: string): void {
    const current = this.profileSubject.value;
    if (current) this.profileSubject.next({ ...current, photo_url: photoUrl });
  }

  changePassword(ancien_password: string, nouveau_password: string): Observable<{ success: boolean; data: { message: string } }> {
    return this.http.patch<{ success: boolean; data: { message: string } }>(
      `${this.apiUrl}/auth/change-password`,
      { ancien_password, nouveau_password },
    );
  }

  registerDahira(payload: {
    dahira: { nom: string; ville: string; telephone: string };
    user: { nom: string; telephone: string; email: string; password: string };
  }): Observable<{ success: boolean; data: { token: string; user: any } }> {
    return this.http
      .post<{ success: boolean; data: { token: string; user: any } }>(
        `${this.apiUrl}/auth/register`,
        payload,
      )
      .pipe(
        tap(res => {
          if (res.success) {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
        }),
      );
  }

  updateProfile(data: { nom: string; telephone: string; email: string }): Observable<{ success: boolean; data: UserProfile }> {
    return this.http.patch<{ success: boolean; data: UserProfile }>(`${this.apiUrl}/users/me`, data).pipe(
      tap(res => {
        if (res.success) {
          this.profileSubject.next(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        }
      })
    );
  }
}

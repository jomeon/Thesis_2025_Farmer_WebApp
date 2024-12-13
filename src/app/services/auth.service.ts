import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserProfile } from '../interfaces/user-interface';
import { jwtDecode } from "jwt-decode";

interface AuthResponse {
  token: string;
  user: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
private apiUrl = 'http://localhost:5000/api/auth'; // Ścieżka względna dzięki proxy
 // private authStatus = new BehaviorSubject<boolean>(this.isAuthenticated());

  private currentUserSubject: BehaviorSubject<UserProfile | null>;
  public currentUser: Observable<UserProfile | null>;

  //authStatus$ = this.authStatus.asObservable();

  constructor(private http: HttpClient) {
    const token = localStorage.getItem('token');
    let user: UserProfile | null = null;
    console.log('token', token);
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        user = decoded.user; // Upewnij się, że backend zwraca obiekt użytkownika w tokenie lub oddzielnie
      } catch (error) {
        console.error('Błąd dekodowania tokenu:', error);
        localStorage.removeItem('token');
      }
    }

    this.currentUserSubject = new BehaviorSubject<UserProfile | null>(user);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get userValue(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('token', response.token);
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('token', response.token);
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}



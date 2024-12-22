// src/app/services/satellite.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SatelliteImage } from '../interfaces/satellite-interface';


const environment =  'http://localhost:5000/api';

@Injectable({
  providedIn: 'root'
})
export class SatelliteService {

  private apiUrl = `${environment}/satellite`;

  constructor(private http: HttpClient) { }

  // Pobierz obrazy satelitarne dla danego pola i daty
  getSatelliteImages(fieldId: string, date: string): Observable<SatelliteImage> {
    let params = new HttpParams()
      .set('fieldId', fieldId)
      .set('date', date);
    return this.http.get<SatelliteImage>(`${this.apiUrl}/images`, { params });
  }
}

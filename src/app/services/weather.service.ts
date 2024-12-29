import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WeatherData } from '../interfaces/weather-data.interface';


const environment =  'http://localhost:5000/api';

@Injectable({
    providedIn: 'root'
  })
  export class WeatherService {

  
  
    private apiUrl = `${environment}/weather`;
  
    constructor(private http: HttpClient) { }
  
    // Pobierz dane pogodowe dla danego pola i daty
    getWeatherData(fieldId: string, date?: string): Observable<WeatherData[]> {
      let params = new HttpParams().set('fieldId', fieldId);
      if (date) {
        params = params.set('date', date);
      }
      return this.http.get<WeatherData[]>(this.apiUrl, { params });
    }
  
    // Dodaj dane pogodowe
    addWeatherData(weather: WeatherData): Observable<WeatherData> {
      return this.http.post<WeatherData>(this.apiUrl, weather);
    }
  
    // Pobierz dane pogodowe z API i zapisz do bazy danych
    fetchAndSaveWeather(fieldId: string, latitude: number, longitude: number): Observable<WeatherData> {
      return this.http.post<WeatherData>(`${this.apiUrl}/fetch`, { fieldId, latitude, longitude });
    }

    getWeatherHistory(fieldId: string): Observable<WeatherData[]> {
      return this.http.get<WeatherData[]>(`${this.apiUrl}/history?fieldId=${fieldId}`);
    }

    getWeatherFromDB(fieldId: string, date: string): Observable<WeatherData[]> {
      return this.http.get<WeatherData[]>(`${this.apiUrl}?fieldId=${fieldId}&date=${date}`);
    }
  }
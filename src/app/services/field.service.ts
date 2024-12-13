// field.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FieldService {
    private apiUrl = 'http://localhost:5000/api/fields';
    private cropsUrl = 'http://localhost:5000/api/crops';
    private weatherUrl = 'http://localhost:5000/api/weather';
  
    constructor(private http: HttpClient) { }
  
    // Metody dla pól
    getFields(): Observable<any> {
      return this.http.get<any>(this.apiUrl);
    }
  
    addField(field: any): Observable<any> {
      return this.http.post<any>(this.apiUrl, field);
    }
  
    updateField(id: string, field: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/${id}`, field);
    }
  
    deleteField(id: string): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }
  
    // Metody dla upraw
    getCrops(): Observable<any> {
      return this.http.get<any>(this.cropsUrl);
    }
  
    addCrop(crop: any): Observable<any> {
      return this.http.post<any>(this.cropsUrl, crop);
    }
  
    updateCrop(id: string, crop: any): Observable<any> {
      return this.http.put<any>(`${this.cropsUrl}/${id}`, crop);
    }
  
    deleteCrop(id: string): Observable<any> {
      return this.http.delete<any>(`${this.cropsUrl}/${id}`);
    }
  
    // Metody dla danych pogodowych
    getWeatherData(fieldId: string, date: string): Observable<any> {
      let params = new HttpParams().set('fieldId', fieldId).set('date', date);
      return this.http.get<any>(this.weatherUrl, { params });
    }
  
    addWeatherData(weather: any): Observable<any> {
      return this.http.post<any>(this.weatherUrl, weather);
    }
  
    // Logika biznesowa po stronie frontendu, np. obliczenia
    calculateEffectiveTemperatureSum(weatherData: any[]): number {
      return weatherData.reduce((sum, day) => sum + day.tempAvg, 0);
    }
}

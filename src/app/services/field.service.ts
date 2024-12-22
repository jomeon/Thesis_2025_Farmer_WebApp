// field.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { Field } from '../interfaces/field-interace';
import { Crop } from '../interfaces/crop-interface';

@Injectable({
  providedIn: 'root'
})
export class FieldService {
    private fieldsUrl = 'http://localhost:5000/api/fields';
    private cropsUrl = 'http://localhost:5000/api/crops';
    private weatherUrl = 'http://localhost:5000/api/weather';


    // Dodanie BehaviorSubject do zarządzania stanem pól
    private fieldsSubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
    public fields$ = this.fieldsSubject.asObservable();
  
    constructor(private http: HttpClient) { }
  
    // Metody dla pól
    getFields(): Observable<Field[]> {
      return this.http.get<Field[]>(this.fieldsUrl);
    }
  
    addField(field: Partial<Field>): Observable<any> {
      return this.http.post<Field>(this.fieldsUrl, field);
    }
  
    updateField(id: string, field: Partial<Field>): Observable<any> {
      return this.http.put<Field>(`${this.fieldsUrl}/${id}`, field);
    }
  
    deleteField(id: string): Observable<any> {
      return this.http.delete<any>(`${this.fieldsUrl}/${id}`);
    }
  
    // Metody dla upraw
    getCrops(): Observable<Crop[]> {
      return this.http.get<Crop[]>(this.cropsUrl);
    }
  
    addCrop(crop: Partial<Crop>): Observable<Crop> {
      return this.http.post<Crop>(this.cropsUrl, crop);
    }
  
    updateCrop(id: string, crop:  Partial<Crop>): Observable<Crop> {
      return this.http.put<Crop>(`${this.cropsUrl}/${id}`, crop);
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

    fetchFields(): void {
      this.getFields().pipe(
        tap(fields => {
          this.fieldsSubject.next(fields);
        }),
        catchError(error => {
          console.error('Error fetching fields:', error);
          this.fieldsSubject.next([]);
          return throwError(error);
        })
      ).subscribe();
    }

    
}

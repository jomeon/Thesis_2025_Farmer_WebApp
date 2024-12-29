import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
// import serwisy, interfejsy itp.
import { WeatherService } from '../../services/weather.service';
import { SatelliteService } from '../../services/satellite.service';
import { FieldService } from '../../services/field.service';
import { Field } from '../../interfaces/field-interace';
import { WeatherData } from '../../interfaces/weather-data.interface';
import { SatelliteImage } from '../../interfaces/satellite-interface';

import * as L from 'leaflet';


@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {

  @ViewChild('map') mapElement!: ElementRef;
  map!: L.Map;

  
  fieldId!: string;
  field?: Field; // można wczytać szczegóły pola
  weatherHistory: WeatherData[] = [];
  satelliteImages: SatelliteImage[] = [];

  displayedColumns: string[] = ['date', 'tempMin', 'tempMax', 'tempAvg', 'rainfall'];

  error: string = '';
  isLoading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private fieldService: FieldService,
    private weatherService: WeatherService,
    private satelliteService: SatelliteService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Pobierz ID z parametru URL
    this.fieldId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.fieldId) {
      this.error = 'Nie znaleziono ID pola w adresie URL';
      return;
    }

    this.fetchFieldData();
    this.fetchWeatherHistory();
    
    // ewentualnie fetchSatelliteHistory - zależy, jak to zaimplementujesz
  }

  ngAfterViewInit(): void {
   
  }

  fetchFieldData(): void {
    // jeśli chcesz wczytać szczegóły pola (nazwa, itp.)
    this.fieldService.getFieldById(this.fieldId).subscribe({
      next: (field: Field) => {
        this.field = field;
        console.log('field', field);
        this.cdRef.detectChanges(); 
        this.initializeMap()
      },
      error: (err: any) => {
        this.error = 'Błąd podczas pobierania danych pola';
        console.error(err);
      }
    });
  }

  fetchWeatherHistory(): void {
    this.isLoading = true;
    // Załóżmy, że w WeatherService masz metodę getWeatherHistory
    // która zwraca listę zapisanych w bazie rekordów pogodowych dla danego fieldId
    this.weatherService.getWeatherHistory(this.fieldId).subscribe({
      next: (weatherData: WeatherData[]) => {
        this.weatherHistory = weatherData;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Błąd podczas pobierania danych pogodowych';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  // ewentualnie, jeśli trzymasz "historyczne obrazy satelitarne" w bazie/serwisie, pobierz:
  // fetchSatelliteHistory(): void {
  //   this.satelliteService.getSatelliteHistory(this.fieldId).subscribe(
  //     ...
  //   );
  // }


  goBackToFields(): void {
    // Przenosi na /fields
    this.router.navigate(['/fields']);
  }


  private initializeMap(): void {
    console.log('initializeMap called');
    console.log('mapElement', this.mapElement);
  
    if (!this.mapElement) {
      this.error = 'Element mapy nie został odnaleziony';
      console.error('mapElement jest undefined');
      return;
    }
  
    if (!this.field || !this.field.polygons || this.field.polygons.length === 0) {
      this.error = 'Brak danych geograficznych dla tego pola';
      console.error('Brak danych geograficznych dla pola');
      return;
    }
  
    // Oblicz wszystkie koordynaty z polygonów
    let allCoordinates: L.LatLng[] = [];
    this.field.polygons.forEach(polygon => {
      const geojson = polygon.geojson as any; // Rzutowanie na 'any' aby ominąć TypeScript
  
      if (geojson && geojson.type === 'Polygon' && geojson.coordinates && geojson.coordinates.length > 0) {
        // Dla typu Polygon, coordinates to tablica tablic punktów
        const coords = geojson.coordinates[0].map((coord: number[]) => L.latLng(coord[1], coord[0]));
        allCoordinates = allCoordinates.concat(coords);
        console.log('allCoordinates after polygon:', allCoordinates);
      } else {
        console.warn('Nieprawidłowa struktura geojson dla polygonu:', polygon);
      }
    });
  
    console.log('allCoordinates:', allCoordinates);
  
    if (allCoordinates.length === 0) {
      this.error = 'Brak koordynatów w polygonach pola';
      console.error('Brak koordynatów w polygonach pola');
      return;
    }
  
    // Oblicz bounding box
    let bounds: L.LatLngBounds;
    try {
      bounds = L.latLngBounds(allCoordinates);
      console.log('Bounds:', bounds);
    } catch (err) {
      this.error = 'Bounds są nieprawidłowe.';
      console.error('Error creating bounds:', err);
      return;
    }
  
    // Inicjalizacja mapy
    try {
      this.map = L.map(this.mapElement.nativeElement).fitBounds(bounds);
      console.log('Map initialized with bounds:', bounds);
    } catch (err) {
      this.error = 'Błąd podczas inicjalizacji mapy.';
      console.error('Error initializing map:', err);
      return;
    }
  
    // Dodanie warstwy kafelków
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
  
    // Dodanie polygonów do mapy
    this.field.polygons.forEach(polygon => {
      const geojson = polygon.geojson as any; // Rzutowanie na 'any'
  
      if (geojson && geojson.type === 'Polygon' && geojson.coordinates) {
        const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
        console.log('Polygon Coordinates:', coordinates);
        const leafletPolygon = L.polygon(coordinates, {
          color: 'blue',
          weight: 2,
          opacity: 0.6,
          fillOpacity: 0.2
        }).addTo(this.map);
  
        // Dodanie popupu do polygonu
        const popupContent = `
          <strong>${this.field?.name}</strong><br/>
          Powierzchnia: ${this.field?.area} ha<br/>
          <strong>Uprawy:</strong>
          <ul>
            ${this.field?.crops.map(crop => `<li><strong>${crop.name}</strong><br/> KosztPerHa: ${crop.costPerHa}<br/>
               Zysk: ${crop.profit}</li>`).join('')}
          </ul>
          <strong>Inne Info:</strong><br/>
          Suma Temperatur Efektywnych: ${this.field?.effectiveTemperatureSum}
        `;
        leafletPolygon.bindPopup(popupContent);
      }
    });
  
    console.log('Map initialized successfully');
  }
  
}

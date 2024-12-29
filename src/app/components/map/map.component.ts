// src/app/pages/map/map.component.ts
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import "leaflet/dist/leaflet.css"
import { Subscription } from 'rxjs';
import { FieldService } from '../../services/field.service';
import { Field } from '../../interfaces/field-interace';
import { Crop } from '../../interfaces/crop-interface';
import { WeatherService } from '../../services/weather.service';
import { WeatherData } from '../../interfaces/weather-data.interface';
import { SatelliteService } from '../../services/satellite.service';
import { SatelliteImage } from '../../interfaces/satellite-interface';

// Ustawienie nowych ścieżek do ikon
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/marker-icon-2x.png',
  iconUrl: 'assets/marker-icon.png',
  shadowUrl: 'assets/marker-shadow.png',
});

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit {

  private fieldsUrl = 'http://localhost:5000/api/fields';
  @ViewChild('map') mapElement!: ElementRef;
  map!: L.Map;
  drawnItems = new L.FeatureGroup();
  polygons: L.Polygon[] = [];

  isLoading: boolean = false;
  error: string = '';
  private subscription: Subscription = new Subscription();

  constructor(private http: HttpClient,
    private fieldService: FieldService,
    private weatherService: WeatherService,
    private satelliteService: SatelliteService
  ) { }

  ngOnInit(): void {
    // Możesz dodać dodatkową inicjalizację tutaj
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.loadFields();
  }

  private initMap(): void {
    this.map = L.map(this.mapElement.nativeElement).setView([51.505, -0.09], 13); // Ustawienia początkowe

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
  }

  private loadFields(): void {
    this.isLoading = true;
    this.subscription = this.fieldService.fields$.subscribe(
      (fields: Field[]) => {
        console.log('Fetched fields:', fields); // Logowanie pobranych pól
        this.clearMap();
        if (fields.length === 0) {
          this.isLoading = false;
          return;
        }
  
        const allLayers = L.featureGroup();
  
        fields.forEach(field => {
          field.polygons.forEach((polygon, index) => {
            console.log(`Processing polygon ${index} for field ${field.name}:`, polygon); // Logowanie przetwarzanego polygonu
            const geojson = polygon.geojson;
            console.log('GeoJSON:', geojson); // Logowanie geojson
  
            if (geojson) {
              const layer = L.geoJSON(geojson, {
                style: {
                  color: 'blue',
                  weight: 2,
                  opacity: 0.6,
                  fillOpacity: 0.2
                }
              });
  
              // Przygotowanie treści popupu
              const popupContent = `
                <strong>${field.name}</strong><br/>
                Powierzchnia: ${field.area} ha<br/>
                <strong>Uprawy:</strong>
                <ul>
                  ${field.crops.map((crop: Crop) => `<li>${crop.name} - KosztPerHa: ${crop.costPerHa}, Zysk: ${crop.profit}</li>`).join('')}
                </ul>
                <strong>Inne Info:</strong><br/>
                Suma Temperatur Efektywnych: ${field.effectiveTemperatureSum}

                
              `;
  
              // Bindowanie popupu z informacjami o polu
              layer.bindPopup(popupContent);
  
              // Opcjonalnie: Otwarie popupu na kliknięciu
              layer.on('click', () => {
                layer.openPopup();
                this.fetchWeatherData(field, geojson, layer);
                this.fetchSatelliteImages(field, geojson, layer);
              });
  
              layer.addTo(allLayers);
            } else {
              console.warn(`Invalid GeoJSON or geometry type for polygon ${index} of field ${field.name}:`, geojson);
            }
          });
        });
  
        allLayers.addTo(this.map);
        this.map.fitBounds(allLayers.getBounds());
        this.isLoading = false;
      },
      (error) => {
        this.error = 'Wystąpił błąd podczas pobierania danych.';
        console.error('Error fetching fields:', error);
        this.isLoading = false;
      }
    );
  
    // Inicjalizacja pobierania danych
    this.fieldService.fetchFields();
  }
  

  private clearMap(): void {
    this.map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        // Zachowaj warstwę kafelków
      } else {
        this.map.removeLayer(layer);
      }
    });
  }

  ngOnDestroy(): void {
    // Zakończ subskrypcję, aby uniknąć wycieków pamięci
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private fetchWeatherData(field: Field, geojson: any, layer: L.GeoJSON): void {
    // Załóżmy, że chcesz pobrać dane TYLKO z bazy dla aktualnego dnia
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`; // np. "2024-01-05"
  
    // Zamiast latitude/longitude do API, używamy TYLKO fieldId + date
    // i pobieramy dane z bazy przez getWeatherFromDB
    this.weatherService.getWeatherFromDB(field._id, dateStr).subscribe(
      (weatherArr: WeatherData[]) => {
        // Zakładamy, że weatherArr to tablica 0..n elementów z bazy
        const weather = weatherArr.length > 0 ? weatherArr[0] : undefined;
  
        let weatherHtml = '';
        if (weather) {
          weatherHtml = `
            <strong>Aktualna Pogoda:</strong><br/>
            Temperatura: ${weather.tempAvg}°C<br/>
            Opady: ${weather.rainfall} mm<br/>
          `;
        } else {
          weatherHtml = `
            <strong>Brak zapisanych danych pogodowych w bazie<br/>
            (Możesz dodać mechanizm, by pobrać z API – ale tylko jeśli to dozwolone)</strong><br/>
          `;
        }
  
        // Teraz zbuduj popup content
        const popupContent = `
          <strong>${field.name}</strong><br/>
          Powierzchnia: ${field.area} ha<br/>
          <strong>Uprawy:</strong>
          <ul>
            ${field.crops
              .map((crop: Crop) => `<li><strong>${crop.name}</strong></br> KosztPerHa: ${crop.costPerHa}</br> Zysk: ${crop.profit}</li>`)
              .join('')}
          </ul>
          <strong>Inne Info:</strong><br/>
          Suma Temperatur Efektywnych: ${field.effectiveTemperatureSum}<br/>
          ${weatherHtml}
  
          <div style="margin-top: 8px;">
            <a href="/fields/${field._id}/history" target="_blank" class="btn btn-primary">
              Zobacz historię pola
            </a>
          </div>
        `;
        layer.bindPopup(popupContent);
        layer.openPopup();
      },
      (error) => {
        console.error('Error fetching weather data from DB:', error);
      }
    );
  }
  

  private fetchSatelliteImages(field: Field, geojson: any, layer: L.GeoJSON): void {
    const fieldId = field._id;
    const date = new Date().toISOString().split('T')[0]; // Możesz dostosować datę do wybranego dnia

    this.satelliteService.getSatelliteImages(fieldId, date).subscribe(
      (image: SatelliteImage) => {
        console.log('Satellite image:', image);
        // Dodanie obrazu jako overlay na mapie
        if (
          geojson &&
          geojson.coordinates &&
          geojson.coordinates[0] &&
          geojson.coordinates[0].length >= 2
        ) {
          // Konwersja współrzędnych na LatLngBoundsExpression
          const imageBounds: L.LatLngBoundsExpression = [
            [geojson.coordinates[0][0][1], geojson.coordinates[0][0][0]], // Górny lewy róg
            [geojson.coordinates[0][2][1], geojson.coordinates[0][2][0]]  // Dolny prawy róg
          ];
  
          // Dodanie obrazu jako overlay na mapie
          L.imageOverlay(image.imageUrl, imageBounds, {
            opacity: 0.6,
            interactive: true,
          })
            .addTo(this.map)
            .bindPopup(`
              <strong>Obraz Satelitarny</strong><br/>
              Data: ${date}<br/>
              <img src="${image.imageUrl}" alt="Satellite Image" style="width:100%; height:auto;">
            `);
        } else {
          console.error('Invalid GeoJSON coordinates:', geojson.coordinates);
        }
      },
      (error) => {
        console.error('Error fetching satellite images:', error);
      }
    );
  }


}

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
import moment from 'moment';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {

  @ViewChild('map') mapElement!: ElementRef;
  map!: L.Map;

  
  fieldId!: string;
  field!: Field; // można wczytać szczegóły pola
  weatherHistory: WeatherData[] = [];
  satelliteImages: { date: string, layer: L.ImageOverlay }[] = [];

  displayedColumns: string[] = ['date', 'tempMin', 'tempMax', 'tempAvg', 'rainfall'];

  error: string = '';
  isLoading: boolean = false;
  satelliteImagesLoading: boolean = false;

  private layerControl!: L.Control.Layers;

  selectedFieldId: string = '';
  
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
        this.fetchSatelliteImages();
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
      this.map = L.map(this.mapElement.nativeElement, {
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false
      }).fitBounds(bounds);
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
          fillOpacity: 0
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

    const sentinelHubLayer = L.tileLayer.wms(
          'https://services.sentinel-hub.com/ogc/wms/46307560-6d4a-49e9-9a21-a6f0b735b961', // <-- Twój instanceId
          {
            layers: '3_NDVI',    // Nazwa warstwy z Sentinel Hub (np. 1_TRUE_COLOR, NDVI etc.)
            format: 'image/jpeg',      // Może być image/png
            transparent: false,
            maxZoom: 19,               // Dostępne max Zoom (zobacz w Sentinel Hub, czy nie wolisz np. 20)
            // attribution: '&copy; Sentinel Hub'
          }
        );

    const baseMaps = {
      "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
      }),
      "sentinelHubLayer": sentinelHubLayer
    };

    

    const overlayMaps: { [key: string]: L.Layer } = {};

    // Tworzenie kontrolera warstw
    this.layerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(this.map);

    console.log('Kontroler warstw dodany do mapy');
  
  
    console.log('Map initialized successfully');
  }

  fetchSatelliteImages(): void {
    if (!this.field || !this.field.polygons || this.field.polygons.length === 0) {
      console.error('Brak danych geograficznych dla pola.');
      return;
    }

    this.satelliteImagesLoading = true;

    // Wyodrębnienie unikalnych dat z historii pogody
    const dates = this.weatherHistory.map(w => w.date);
    const uniqueDates = Array.from(new Set(dates.map(date => moment(date).format('YYYY-MM-DD'))));

    let remaining = uniqueDates.length;

    uniqueDates.forEach(date => {
      this.satelliteService.getSatelliteImages(this.fieldId, date).subscribe({
        next: (satelliteImage: SatelliteImage) => {
          // Tworzenie ImageOverlay dla obrazu RGB
          const imageUrlDefault = satelliteImage.imageBase64Default;
          // Tworzenie ImageOverlay dla obrazu NDVI
          const imageUrlNdvi = satelliteImage.imageBase64Ndvi;

          console.log("Data dla daty", date, satelliteImage);
           console.log("Default = ", satelliteImage.imageBase64Default?.slice(0,100));  // Tylko kawałek
          console.log("NDVI = ", satelliteImage.imageBase64Ndvi?.slice(0,100));

          //?
          if (!imageUrlDefault && !imageUrlNdvi) {
            console.warn(`Brak obrazów satelitarnych (default/NDVI) dla daty ${date}`);
            remaining--;
            if (remaining === 0) { this.satelliteImagesLoading = false; }
            return;
          }

          // Obliczenie granic obrazu na podstawie polygonów pola
          const allCoordinates = this.field.polygons.flatMap(polygon => {
            const geojson = polygon.geojson as any;
            if (geojson && (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') && geojson.coordinates && geojson.coordinates.length > 0) {
                return geojson.coordinates[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
            }
            return [];
          });

          const imageBounds: L.LatLngBoundsExpression = L.latLngBounds(allCoordinates);
          console.log(`Granice obrazu dla daty ${date}:`, imageBounds);

          const preloadRGB = new Image();
          preloadRGB.src = imageUrlDefault; // base64 do testu
          preloadRGB.onload = () => {
            // Kiedy obraz się załaduje w pamięci, dopiero tworzymy nakładkę:
            const imageOverlayDefault = L.imageOverlay(imageUrlDefault, imageBounds, {
              opacity: 1,
              interactive: true,
              attribution: `Obraz satelitarny RGB z dnia ${date}`
            });

            // Dodajemy do panelu warstw
            this.layerControl.addOverlay(imageOverlayDefault, `Satelita RGB ${date}`);

            // Opcjonalnie zapisz w satelliteImages (jeśli gdzieś używasz)
            this.satelliteImages.push({ date: date, layer: imageOverlayDefault });
            console.log('Dodano overlay RGB do panelu warstw dla daty:', date);
          };
          preloadRGB.onerror = () => {
            console.warn('Nie udało się wczytać base64 dla RGB:', date);
          };

          // NDVI
          const preloadNDVI = new Image();
          preloadNDVI.src = imageUrlNdvi;
          preloadNDVI.onload = () => {
            const imageOverlayNdvi = L.imageOverlay(imageUrlNdvi, imageBounds, {
              opacity: 1,
              interactive: true,
              attribution: `Obraz satelitarny NDVI z dnia ${date}`
            });

            this.layerControl.addOverlay(imageOverlayNdvi, `Satelita NDVI ${date}`);
            this.satelliteImages.push({ date: date, layer: imageOverlayNdvi });
            console.log('Dodano overlay NDVI do panelu warstw dla daty:', date);
          };
          preloadNDVI.onerror = () => {
            console.warn('Nie udało się wczytać base64 dla NDVI:', date);
          };

          // <-- REMOVED: Nie tworzymy nakładek "od razu", tylko w onload (patrz wyżej).
          //
          // this.layerControl.addOverlay(imageOverlayDefault, `Satelita RGB ${date}`);
          // this.layerControl.addOverlay(imageOverlayNdvi, `Satelita NDVI ${date}`);

          // Zmniejsz licznik
          remaining--;
          if (remaining === 0) {
            this.satelliteImagesLoading = false;
          }
        },
        error: (err) => {
          console.error(`Błąd podczas pobierania obrazu satelitarnego dla daty ${date}:`, err);
          remaining--;
          if (remaining === 0) {
            this.satelliteImagesLoading = false;
          }
        }
      });
    });
  }
  
}

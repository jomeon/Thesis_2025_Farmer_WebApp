import { AfterViewInit, Component, ElementRef, Inject, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as turf from '@turf/turf';
import * as L from 'leaflet';

import 'leaflet-draw';


@Component({
  selector: 'app-add-field-dialog',
  templateUrl: './add-field-dialog.component.html',
  styleUrls: ['./add-field-dialog.component.scss']
})
export class AddFieldDialogComponent implements OnInit, AfterViewInit {
  fieldForm: FormGroup;
  expandedIndex: number = 0; // Zmieniony typ na number
  private cropIdCounter: number = 0; // Licznik unikalnych ID

  

  @ViewChildren('panelElement', { read: ElementRef }) panelElements!: QueryList<ElementRef>;
  
  @ViewChild('map') mapElement!: ElementRef;
  map!: L.Map;
  drawnItems = new L.FeatureGroup();

  polygons: L.Polygon[] = [];
  
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddFieldDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.fieldForm = this.fb.group({
      name: ['', Validators.required],
      area: [0, [Validators.required, Validators.min(0)]],
      polygons: [[]],
      crops: this.fb.array([this.createCrop()])
    });
  }

  ngOnInit(): void {   
    console.log('Initial crops:', this.crops.value);
    this.fieldForm.valueChanges.subscribe((val) => {
      // Obliczmy sumę procentów
      const total = val.crops.reduce((acc: number, c: any) => acc + c.percentage, 0);
      console.log('Suma procentów:', total);
      // Ewentualnie zapisuj do jakiegoś this.totalPerc, by wyświetlić w template
    });
    this.expandedIndex = 0;
  }


  ngAfterViewInit(): void {
    // Subskrybujemy zmiany w expansion panels, aby przewijać do nowo dodanych upraw
    this.panelElements.changes.subscribe(() => {
      this.scrollToLastPanel();
    });

    this.initMap();
  }

  get crops(): FormArray {
    return this.fieldForm.get('crops') as FormArray;
  }

  createCrop(): FormGroup {
    return this.fb.group({
      id: [this.cropIdCounter++],
      name: ['', Validators.required],
      cost: [0, [Validators.required, Validators.min(0)]],
      profit: [0, [Validators.required, Validators.min(0)]],
      percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
  }

  addCrop(): void {
    this.crops.push(this.createCrop());
    this.expandedIndex = this.crops.length - 1; // Ustawienie nowo dodanej uprawy jako rozwiniętej
    // Czekamy na aktualizację widoku, a następnie przewijamy
    setTimeout(() => {
      this.scrollToLastPanel();
    }, 0);
  }

  // removeCrop(index: number): void {
  //   this.crops.removeAt(index); 

  //   if (this.expandedIndex === index) {
  //   this.expandedIndex = 0; // Żaden panel nie jest otwarty
  // } else if (this.expandedIndex > index) {
  //   this.expandedIndex--; // Przesunięcie indeksu
  // }
  // }

  removeCropById(cropId: number): void {
    const cropsArray = this.crops;
  
    // Znajdź indeks elementu na podstawie ID
    const index = cropsArray.controls.findIndex(crop => crop.get('id')?.value === cropId);
  
    if (index !== -1) {
      cropsArray.removeAt(index); // Usuń element z FormArray
  
      // Aktualizacja expandedIndex
      if (cropsArray.length === 0) {
        this.expandedIndex = 0; // Resetowanie, jeśli nie ma paneli
      } else if (this.expandedIndex >= cropsArray.length) {
        this.expandedIndex = cropsArray.length - 1; // Ustaw na ostatni istniejący panel
      }
    }
  
    // Odśwież widok formularza
    

    this.fieldForm.markAsPristine();
    this.fieldForm.updateValueAndValidity();
  }
  
  

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.fieldForm.valid) {
      const formValue = this.fieldForm.value;
      
      // 1. Sprawdzenie sumy procentów
      const totalPercentage = formValue.crops.reduce((acc: number, c: any) => acc + c.percentage, 0);
      if (totalPercentage > 100) {
        alert('Łączny udział procentowy upraw przekracza 100%! Proszę skorygować.');
        return;
      }
  
      // 2. Pobieranie polygons
      const polygons = this.getPolygonsData();
      if (polygons.length === 0) {
        alert('Proszę narysować przynajmniej jeden polygon.');
        return;
      }
  
      // 3. Obliczanie ha i zysku/straty dla każdej uprawy
      // formValue.area - całkowita powierzchnia (ha)
      // Każda uprawa: haUprawy = (percentage/100) * area
      // ZyskUprawy = (profit - cost) * haUprawy
      // const recalculatedCrops = formValue.crops.map((crop: any) => {

      //   const costPerHa = crop.cost;
      //   const returnPerHa = crop.profit; 
      //   const percentage = crop.percentage ?? 0;

      // // Wielkość uprawy w ha
      //   const sizeHa = (percentage / 100) * formValue.area;
      
      //   // Oczekiwany zysk (dla całej uprawy), może wyjść ujemny
      //   const finalProfit = (returnPerHa - costPerHa) * sizeHa;

      //   return {
      //     name: crop.name,
      //     percentage,
      //     costPerHa,           // rename
      //     returnPerHa, 
      //     size: parseFloat(sizeHa.toFixed(2)), 
      //     profit: parseFloat(finalProfit.toFixed(2)),
      //     loss: finalProfit < 0 ? Math.abs(finalProfit) : 0,
      //     description: crop.description || '',
      //     effectiveTemperatureSum: crop.effectiveTemperatureSum || 0
      //   };
      // });
  
      // // 4. Tworzymy finalny obiekt
      // const fieldData = {
      //   name: formValue.name,
      //   area: formValue.area,
      //   polygons: {
      //     type: 'FeatureCollection',
      //     features: polygons
      //   },
      //   crops: recalculatedCrops
      // };
      const area = formValue.area; // całkowita powierzchnia w ha

      // 3. Oblicz parametry cropów
      //    cost -> costPerHa
      //    profit -> returnPerHa
      //    size = (percentage/100)*area
      //    finalProfit = (returnPerHa - costPerHa)*size
      const recalculatedCrops = formValue.crops.map((crop: any) => {
        const costPerHa = crop.cost;    // w [PLN/ha]
        const returnPerHa = crop.profit; // w [PLN/ha]
        const pct = crop.percentage || 0;
  
        const size = (pct / 100) * area; 
        const finalProfit = (returnPerHa - costPerHa) * size; 
        const lossValue = finalProfit < 0 ? Math.abs(finalProfit) : 0;
  
        return {
          name: crop.name,
          costPerHa: crop.cost,   
          returnPerHa: crop.profit,
          percentage: crop.percentage,
          size: size.toFixed(2),
          profit: finalProfit,
          loss: lossValue
        };
      });
  
      // 4. Zbuduj obiekt fieldData
      const fieldData = {
        name: formValue.name,
        area: formValue.area,
        polygons: {
          type: 'FeatureCollection',
          features: polygons
        },
        crops: recalculatedCrops
      };
      // 5. Zamykamy dialog z fieldData
      this.dialogRef.close(fieldData);
    }
  }

  onPanelOpened(index: number): void {
    this.expandedIndex = index;
  }

  scrollToLastPanel(): void {
    const panelsArray = this.panelElements.toArray();
    if (panelsArray.length > 0) {
      const lastPanel = panelsArray[panelsArray.length - 1];
      lastPanel.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  trackByFn(index: number, item: AbstractControl): number {
    return item.get('id')?.value || index;
  }

  initMap(): void {
    this.map = L.map(this.mapElement.nativeElement).setView([51.505, -0.09], 13); // Ustawienia początkowe

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Inicjalizacja FreeDraw
    this.map.addLayer(this.drawnItems);

    // Konfiguracja narzędzi rysowania
    const drawControl = new (L.Control.Draw)({
      edit: {
        featureGroup: this.drawnItems
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: false,
          drawError: {
            color: '#e1e100',
            message: '<strong>Błąd:<strong> nie można przeciąć się polygonów!'
          },
          shapeOptions: {
            color: '#97009c'
          }
        },
        polyline: false,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false
      }
    });
    this.map.addControl(drawControl);

    // Obsługa zdarzenia tworzenia nowego polygonu
    this.map.on(L.Draw.Event.CREATED, (event: any) => {
      const layer = event.layer;
      this.drawnItems.addLayer(layer);
      this.calculateArea();
      this.calculateCentroid();
    });

    // Opcjonalnie: Obsługa edycji polygonów
    this.map.on(L.Draw.Event.EDITED, (event: any) => {
      const layers = event.layers;
      layers.eachLayer((layer: any) => {
        this.calculateArea();
        this.calculateCentroid();
      });
    });

    // Opcjonalnie: Obsługa usuwania polygonów
    this.map.on(L.Draw.Event.DELETED, (event: any) => {
      // Możesz zaimplementować logikę po usunięciu polygonu
    });
  }

  calculateArea(): void {
    let totalArea = 0;
    this.drawnItems.eachLayer((layer: any) => {
      if (layer instanceof L.Polygon) {
        const geoJson = layer.toGeoJSON();
        const area = turf.area(geoJson); // Powierzchnia w metrach kwadratowych
        totalArea += area;
      }
    });
    const areaHectares = (totalArea / 10000).toFixed(2); // Konwersja na hektary
    this.fieldForm.patchValue({ area: parseFloat(areaHectares) });
  }

  getPolygonsData(): any[] {
    const polygons: any[] = [];
    this.drawnItems.eachLayer((layer: any) => {
      if (layer instanceof L.Polygon) {
        polygons.push(layer.toGeoJSON());
      }
    });
    return polygons;
  }

  updateArea(area: number): void {
    this.fieldForm.patchValue({ area: area });
  }
  
  calculateCentroid(): void {
    this.drawnItems.eachLayer((layer: any) => {
      if (layer instanceof L.Polygon) {
        const geoJson = layer.toGeoJSON();
        const centroid = turf.centroid(geoJson);
        const [longitude, latitude] = centroid.geometry.coordinates;
        this.fieldForm.patchValue({
          location: {
            latitude,
            longitude
          }
        });
      }
    });
  }

}

// src/app/pages/map/map.component.ts
import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import "leaflet/dist/leaflet.css"

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
export class MapComponent implements OnInit {

  private map!: L.Map;



  constructor() { }

  ngOnInit(): void {
    // this.initMap();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    const iconRetinaUrl = 'assets/leaflet/images/marker-icon-2x.png';
    const iconUrl = './node_modules/leaflet/dist/images/marker-icon.png';
    const shadowUrl = 'assets/leaflet/images/marker-shadow.png';

    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41], // Rozmiar ikony
      iconAnchor: [12, 41], // Punkt zaczepienia ikony
      shadowSize: [41, 41], // Rozmiar cienia
    });
    this.map = L.map('map', {
      center: [51.505, -0.09], // Koordynaty początkowe
      zoom: 13
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Przykładowy marker
    const marker = L.marker([51.5, -0.09]).addTo(this.map);
    marker.bindPopup('yo').openPopup();
  }

}

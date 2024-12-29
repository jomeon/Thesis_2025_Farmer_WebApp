import { Crop } from "./crop-interface";

export interface Polygon {
    geojson: GeoJSON.Feature<GeoJSON.Polygon>;
    name: string;
  }

export interface Field {
    _id: string;
    name: string;
    area: number;
    location: {
      latitude: number;
      longitude: number;
    };
    polygons: Polygon[];
    crops: Crop[];
    effectiveTemperatureSum: number;
    totalProfit?: number;
    totalLoss?: number;
    __v: number;
    createdAt?: string; // Opcjonalnie, jeśli API zwraca te pola
    updatedAt?: string; // Opcjonalnie, jeśli API zwraca te pola
  }

  export interface PolygonGeoJSON {
    type: 'Polygon';
    coordinates: number[][][];
  }
  
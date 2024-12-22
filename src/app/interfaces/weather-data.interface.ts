export interface WeatherData {
    _id?: string;
    field: string;
    date: Date;
    rainfall: number; // Opady w mm
    tempMin: number;
    tempMax: number;
    tempAvg: number;
  }
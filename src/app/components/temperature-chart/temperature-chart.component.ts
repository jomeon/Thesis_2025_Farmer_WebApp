import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, Input } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';
import { WeatherService } from '../../services/weather.service';
import { WeatherData } from '../../interfaces/weather-data.interface';
// [ZMIANA 1]: Importujemy `Chart` z 'chart.js/auto' - zapewnia rejestrację wszystkich komponentów
import ChartJS from 'chart.js/auto';

@Component({
  selector: 'app-temperature-chart',
  templateUrl: './temperature-chart.component.html',
  styleUrls: ['./temperature-chart.component.scss']
})
export class TemperatureChartComponent implements OnInit, AfterViewInit {

  @Input() fieldId!: string;

  @ViewChild('myChart') myChartRef!: ElementRef; 

  private chart!: Chart; 

  constructor(private weatherService: WeatherService) {}

  // [ZMIANA 2]: W `ngOnInit()` NIE tworzymy wykresu (bo @ViewChild jest jeszcze undefined).
  // Tutaj tylko sprawdzamy, czy mamy `fieldId`, i ewentualnie można zainicjować logikę (np. fetch danych).
  ngOnInit(): void {
    if (!this.fieldId) {
      console.warn('Brak fieldId! Komponent nie wywoła zapytania.');
      return;
    }

    // Wywołujemy metodę pobierania danych z backendu. 
    // W metodzie subskrypcji, gdy już mamy dane, będziemy renderować wykres.
    this.fetchWeatherDataFromBackend();
  }

  // [ZMIANA 3]: W `ngAfterViewInit()` możemy dla TESTU wyświetlić wykres z danymi "na sztywno",
  // aby upewnić się, że samo renderowanie Chart.js działa zanim wczytamy dane z API.
  // Jeśli nie chcesz testowych danych, możesz to pominąć.
  ngAfterViewInit(): void {
    console.log('ngAfterViewInit -> canvas jest gotowy');

    // [ZMIANA 4]: OPCJONALNIE - Tymczasowe testowe dane (dla debugowania)
   
  }

  // [ZMIANA 5]: Metoda do pobierania danych z backendu.
  private fetchWeatherDataFromBackend(): void {
    this.weatherService.getWeatherHistory(this.fieldId).subscribe({
      next: (weatherArray: WeatherData[]) => {
        console.log('Dane z backendu:', weatherArray);

        // Sortujemy dane według daty
        const sortedData = weatherArray.sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        // Po otrzymaniu danych – wywołujemy render wykresu
        this.renderChartWithData(sortedData, false);
      },
      error: (err) => {
        console.error('Błąd pobierania danych pogodowych:', err);
      }
    });
  }

  // [ZMIANA 6]: Metoda wspólna do rysowania/aktualizacji wykresu.
  // Pozwala użyć raz danych testowych, raz danych z backendu.
  private renderChartWithData(data: Partial<WeatherData>[], isTest: boolean): void {
    if (!this.myChartRef?.nativeElement) {
      console.warn('Brak canvasu (myChartRef) – nie można narysować wykresu');
      return;
    }

    // 1. Wyciągamy/formatujemy dane do labels i wartości (tempAvg).
    const sortedData = data.sort((a, b) =>
      new Date(a.date!).getTime() - new Date(b.date!).getTime()
    );
    const labels = sortedData.map(item => this.formatDate(item.date as unknown as string));
    const tempAvgData = sortedData.map(item => item.tempAvg || 0);

    // 2. (Opcjonalnie) Forecast
    let forecastLabels: string[] = [];
    let forecastData: (number | null)[] = [];
    if (!isTest && sortedData.length > 0) {
      // Tylko jeśli to nie dane testowe i mamy cokolwiek
      const forecastDays = 7;
      const sum = tempAvgData.reduce((acc, val) => acc + val, 0);
      const averageTemp = sum / tempAvgData.length;

      let lastDate = new Date(sortedData[sortedData.length - 1].date!);

      for (let i = 1; i <= forecastDays; i++) {
        lastDate.setDate(lastDate.getDate() + 1);
        forecastLabels.push(this.formatDate(lastDate.toISOString()));
        const randomOffset = (Math.random() * 2) - 1; 
        forecastData.push(averageTemp + randomOffset);
      }
    }

    // 3. Konfiguracja
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: [...labels, ...forecastLabels],
        datasets: [
          {
            label: isTest
              ? 'Temperatura (TEST)'
              : 'Średnia temperatura (historyczna)',
            data: tempAvgData,
            borderColor: isTest ? 'orange' : 'red',
            backgroundColor: isTest
              ? 'rgba(255, 165, 0, 0.2)'
              : 'rgba(255, 0, 0, 0.1)',
            tension: 0.3,
            fill: true,
            spanGaps: true, 
          },
          // Forecast
          ...(!isTest && tempAvgData.length > 0
            ? [{
                label: 'Prognoza (prosty forecast)',
                data: [
                  ...Array(tempAvgData.length - 1).fill(null),
                  tempAvgData[tempAvgData.length - 1],
                  ...forecastData
                ],
                spanGaps: true, 
                borderColor: 'blue',
                backgroundColor: 'rgba(0, 0, 255, 0.1)',
                borderDash: [5, 5],
                tension: 0.3,
                fill: false
              }]
            : [])
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Data'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Temperatura (°C)'
            }
          }
        },
        plugins: {
          legend: {
            display: true,
          },
        }
      }
    };

    // 4. Inicjalizacja/aktualizacja wykresu
    const ctx = this.myChartRef.nativeElement.getContext('2d');
    if (this.chart) {
      this.chart.destroy();
    }
    this.chart = new ChartJS(ctx, config);
  }

  private formatDate(dateStr: string): string {
    const dateObj = new Date(dateStr);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

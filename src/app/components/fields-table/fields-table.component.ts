import { Component, OnInit } from '@angular/core';
import { FieldService } from '../../services/field.service';

@Component({
  selector: 'app-fields-table',
  templateUrl: './fields-table.component.html',
  styleUrls: ['./fields-table.component.scss']
})
export class FieldsTableComponent implements OnInit {
  fields: any[] = [];
  weatherData: any = {};
  selectedDate: string = new Date().toISOString().split('T')[0];
  displayedColumns: string[] = ['name', 'area', 'crops', 'rainfall', 'temperature', 'profitLoss'];

  constructor(private fieldService: FieldService) { }

  ngOnInit(): void {
    this.loadFields();
  }

  loadFields(): void {
    this.fieldService.getFields().subscribe(data => {
      this.fields = data;
      this.loadWeatherData();
    });
  }

  onDateChange(event: any): void {
    this.selectedDate = event.target.value;
    this.loadWeatherData();
  }

  loadWeatherData(): void {
    // Implementacja pobierania danych pogodowych
    // Możesz dodać nowy endpoint w backendzie lub użyć istniejącego
    // Przykład:
    this.fields.forEach(field => {
      // Zakładam, że masz endpoint do pobierania danych pogodowych dla konkretnego pola i daty
      this.fieldService.getWeatherData(field._id, this.selectedDate).subscribe(data => {
        this.weatherData[field._id] = data[0]; // Zakładam, że zwraca tablicę z jednym obiektem
      });
    });
  }
}

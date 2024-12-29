export interface Crop {

    _id: string;
    field: string;
    name: string;
    size: number;
    percentage: number;
    costPerHa: number;
    returnPerHa: number;
    profit: number;
    loss: number;
    description: string;
    effectiveTemperatureSum: number;
    startDate?: Date;
    endDate?: Date;  
    __v: number;
  }
  

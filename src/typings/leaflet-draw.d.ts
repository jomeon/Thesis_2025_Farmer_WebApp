
import * as L from 'leaflet';
import 'leaflet-draw';

declare module 'leaflet' {
  namespace Control {
    namespace Draw {
      class Toolbar {
        constructor(options?: any);
      }

      class Draw extends L.Control {
        constructor(options?: any);
      }
    }
  }

  namespace Draw {
    class Toolbar {
      constructor(map: L.Map, options?: any);
    }
  }
}

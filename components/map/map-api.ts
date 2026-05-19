export type MapApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  locate: () => void;
  flyTo: (lat: number, lng: number) => void;
};

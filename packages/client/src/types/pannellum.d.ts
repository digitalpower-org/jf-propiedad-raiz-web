declare module 'pannellum' {
  interface ViewerOptions {
    type?: string;
    panorama?: string;
    autoLoad?: boolean;
    showZoomCtrl?: boolean;
    showFullscreenCtrl?: boolean;
    keyboardZoom?: boolean;
    mouseZoom?: boolean;
    touchZoom?: boolean;
    autoRotate?: number;
    autoRotateInactivityDelay?: number;
    hfov?: number;
    minHfov?: number;
    maxHfov?: number;
    pitch?: number;
    yaw?: number;
    minPitch?: number;
    maxPitch?: number;
    minYaw?: number;
    maxYaw?: number;
    compass?: boolean;
    northOffset?: number;
    showControls?: boolean;
    orientationOnByDefault?: boolean;
    [key: string]: unknown;
  }

  interface Viewer {
    destroy(): void;
  }

  const viewer: (container: HTMLElement, options: ViewerOptions) => { destroy: () => void };
  export { viewer };
  export default viewer;
}

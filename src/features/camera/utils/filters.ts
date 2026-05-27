export interface CameraFilter {
  id: string;
  name: string;
  filterStyle: string; // CSS Filter string (e.g. sepia(0.3) contrast(1.1))
  overlayClass?: string; // Additional Tailwind style overlays
  colorMarker: string; // Colored badge for selectors
}

export const CAMERA_FILTERS: CameraFilter[] = [
  {
    id: 'normal',
    name: 'Normal',
    filterStyle: 'none',
    colorMarker: 'bg-zinc-500'
  },
  {
    id: 'retro',
    name: 'Vintage',
    filterStyle: 'sepia(0.4) contrast(1.15) brightness(1.05) saturate(1.1)',
    overlayClass: 'bg-amber-900/5 mix-blend-color-burn',
    colorMarker: 'bg-amber-600'
  },
  {
    id: 'cyberpunk',
    name: 'Neon Cyber',
    filterStyle: 'hue-rotate(280deg) saturate(1.7) contrast(1.2) brightness(0.95)',
    overlayClass: 'bg-indigo-900/10 mix-blend-screen',
    colorMarker: 'bg-fuchsia-500'
  },
  {
    id: 'noir',
    name: 'Noir Noir',
    filterStyle: 'grayscale(1) contrast(1.4) brightness(0.9)',
    colorMarker: 'bg-zinc-900 border border-white/20'
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    filterStyle: 'brightness(1.05) saturate(1.25) sepia(0.15) contrast(1.05)',
    overlayClass: 'bg-yellow-500/5 mix-blend-color-dodge',
    colorMarker: 'bg-yellow-500'
  },
  {
    id: 'beauty',
    name: 'Soft Glow',
    filterStyle: 'contrast(0.95) brightness(1.1) saturate(1.05)',
    overlayClass: 'backdrop-blur-[0.5px]',
    colorMarker: 'bg-rose-300'
  },
  {
    id: 'matrix',
    name: 'Emerald',
    filterStyle: 'hue-rotate(100deg) saturate(1.4) contrast(1.1) brightness(0.9)',
    colorMarker: 'bg-emerald-500'
  }
];

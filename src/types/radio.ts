export interface RadioStation {
  id: string;
  name: string;
  subtitle: string;
  videoId: string;
  thumbnailUrl: string;
  isLive: boolean;
  isCustom?: boolean;
}

export const PRESET_STATIONS: RadioStation[] = [
  {
    id: 'claude-fm',
    name: 'Claude FM',
    subtitle: 'Music for thinking & building',
    videoId: 'tRsQsTMvPNg',
    thumbnailUrl: 'https://i.ytimg.com/vi/tRsQsTMvPNg/hqdefault.jpg',
    isLive: true,
  },
  {
    id: 'lofi-girl',
    name: 'Lofi Girl',
    subtitle: 'Beats to relax/study to',
    videoId: 'jfKfPfyJRdk',
    thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    isLive: true,
  },
  {
    id: 'chillhop',
    name: 'Chillhop Radio',
    subtitle: 'Jazzy & lofi hip hop',
    videoId: '5yx6BWlEVcY',
    thumbnailUrl: 'https://i.ytimg.com/vi/5yx6BWlEVcY/hqdefault.jpg',
    isLive: true,
  },
  {
    id: 'synthwave',
    name: 'Synthwave Radio',
    subtitle: 'Chill retro synth beats',
    videoId: '4xDzrJKXOOY',
    thumbnailUrl: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
    isLive: true,
  },
];

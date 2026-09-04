export interface RadioStation {
  id: string;
  name: string;
  subtitle: string;
  streamUrl?: string;
  videoId?: string;
  thumbnailUrl: string;
  isLive: boolean;
  isCustom?: boolean;
}

export const PRESET_STATIONS: RadioStation[] = [
  {
    id: 'claude-fm',
    name: 'Claude FM',
    subtitle: 'Music for thinking & building',
    streamUrl: 'https://0nlineradio.radioho.st/0r-lo-fi',
    videoId: 'tRsQsTMvPNg',
    thumbnailUrl: 'https://i.ytimg.com/vi/tRsQsTMvPNg/hqdefault.jpg',
    isLive: true,
  },
  {
    id: 'lofi-girl',
    name: 'Lofi Girl',
    subtitle: 'Beats to relax/study to',
    streamUrl: 'https://stream.laut.fm/lofi',
    videoId: 'rFZHOHl-L8A',
    thumbnailUrl: 'https://i.ytimg.com/vi/rFZHOHl-L8A/hqdefault.jpg',
    isLive: true,
  },
  {
    id: 'chillhop',
    name: 'Chillhop Radio',
    subtitle: 'Jazzy & lofi hip hop',
    streamUrl: 'https://stream.bigfm.de/lofifocus/mp3-128/radiobrowser',
    videoId: 'i6WzngxTnBA',
    thumbnailUrl: 'https://i.ytimg.com/vi/i6WzngxTnBA/hqdefault.jpg',
    isLive: true,
  },
  {
    id: 'synthwave',
    name: 'Synthwave Radio',
    subtitle: 'Chill retro synth beats',
    streamUrl: 'https://radio.plaza.one/mp3',
    videoId: '4xDzrJKXOOY',
    thumbnailUrl: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
    isLive: true,
  },
];

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  coverUrl: string;
  audioUrl: string;
}

export const SOKA8IMO_PLAYLIST: Track[] = [
  {
    id: '1',
    title: 'Grand Escape (feat. Toko Miura)',
    artist: 'RADWIMPS, Toko Miura',
    duration: '05:39',
    coverUrl: '/icon-192x192.png',
    // High quality streaming audio sources (Free CDN / Lo-Fi & Synth & Anime flows)
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=japanese-garden-112344.mp3',
  },
  {
    id: '2',
    title: 'バイオレンス (Violence)',
    artist: 'QUEEN BEE (女王蜂)',
    duration: '03:52',
    coverUrl: '/icon-192x192.png',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=cyberpunk-2099-10701.mp3',
  },
  {
    id: '3',
    title: 'This fffire',
    artist: 'Franz Ferdinand',
    duration: '03:38',
    coverUrl: '/icon-192x192.png',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=action-rock-124424.mp3',
  },
  {
    id: '4',
    title: 'Suzume (すずめ)',
    artist: 'RADWIMPS, Toaka',
    duration: '03:58',
    coverUrl: '/icon-192x192.png',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=in-the-forest-ambient-acoustic-guitar-12179.mp3',
  },
  {
    id: '5',
    title: 'Kaikai Kitan (廻廻奇譚)',
    artist: 'Eve',
    duration: '03:41',
    coverUrl: '/icon-192x192.png',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_c36bf12b0e.mp3?filename=lofi-study-112191.mp3',
  },
  {
    id: '6',
    title: 'Yoru ni Kakeru (夜に駆ける)',
    artist: 'YOASOBI',
    duration: '04:21',
    coverUrl: '/icon-192x192.png',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591201e.mp3?filename=chill-abstract-intention-12099.mp3',
  },
];

"use client";

import { useRef, useState } from "react";

const STORY_MUSIC_TRACKS = [
  { id: "chinese-music-a", name: "中式弦歌一", src: "/dream-assets/audio/music/chinese-music-a.mp3" },
  { id: "chinese-music-b", name: "中式弦歌二", src: "/dream-assets/audio/music/chinese-music-b.mp3" },
  { id: "ancient-journey", name: "古意行旅", src: "/dream-assets/audio/music/ancient-journey.mp3" },
  { id: "chinese-harmony", name: "中式和鸣", src: "/dream-assets/audio/music/chinese-harmony.mp3" }
] as const;

type StoryMusicTrack = (typeof STORY_MUSIC_TRACKS)[number];

export function StoryMusicControl() {
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [trackId, setTrackId] = useState<StoryMusicTrack["id"]>(STORY_MUSIC_TRACKS[0].id);
  const audioRef = useRef<HTMLAudioElement>(null);
  const track = STORY_MUSIC_TRACKS.find((item) => item.id === trackId) ?? STORY_MUSIC_TRACKS[0];

  const playTrack = (nextTrack: StoryMusicTrack) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.getAttribute("src") !== nextTrack.src) {
      audio.setAttribute("src", nextTrack.src);
      audio.load();
    }
    setPlaying(true);
    void audio.play().catch(() => setPlaying(false));
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    playTrack(track);
  };

  const selectTrack = (nextTrack: StoryMusicTrack) => {
    setTrackId(nextTrack.id);
    setOpen(false);
    playTrack(nextTrack);
  };

  return <div className="story-music-control" data-open={open ? "true" : "false"} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
    <audio ref={audioRef} aria-label="故事背景音乐" src={track.src} loop preload="none" />
    <button
      aria-label={playing ? "暂停故事音乐" : "播放故事音乐"}
      aria-pressed={playing}
      className="story-music-toggle"
      type="button"
      onClick={togglePlayback}
    >
      <span className="story-music-glyph" aria-hidden="true">{playing ? "♫" : "♪"}</span>
      <span className="story-music-label">{playing ? track.name : "音乐"}</span>
    </button>
    <button
      aria-expanded={open}
      aria-haspopup="menu"
      aria-label="选择故事音乐"
      className="story-music-menu-button"
      type="button"
      onClick={() => setOpen((current) => !current)}
    >⌄</button>
    {open ? <div className="story-music-menu" role="menu" aria-label="故事音乐曲目">
      {STORY_MUSIC_TRACKS.map((item) => <button
        aria-checked={item.id === trackId}
        className={item.id === trackId ? "selected" : ""}
        key={item.id}
        role="menuitemradio"
        type="button"
        onClick={() => selectTrack(item)}
      >{item.name}</button>)}
    </div> : null}
  </div>;
}

export { STORY_MUSIC_TRACKS };

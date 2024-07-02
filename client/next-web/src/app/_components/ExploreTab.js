'use client'
import CharacterCard from './CharacterCard';
import { useState, useRef } from 'react';

export default function ExploreTab({ characters, isDisplay }) {
  const display = isDisplay ? 'flex' : 'hidden';
  const [playingId, setPlayingId] = useState('');
  const audioRef = useRef(null);

  function handlePlay(id, audio_url) {
    let playPromise;
    audioRef.current.src = audio_url;
    if (playingId == id) {
      // Show stop
      audioRef.current.load();
      setPlayingId('');
    } else {
      // Play
      playPromise = audioRef.current.play();
      playPromise.then(_ => {
        setPlayingId(id);
      })
    }
  }

  function handleEnded() {
    setPlayingId('');
  }

  return (
    <section className={`flex flex-row flex-wrap justify-center mt-3 gap-0 md:gap-2 ${display}`}>
      <audio ref={audioRef} preload="none" onEnded={handleEnded}>
        Your browser does not support the audio tag.
      </audio>
      {
        characters?.map(character => (
          <div
            key={character.character_id}
            className="w-full md:basis-52"
          >
            <CharacterCard
              character={character}
              playingId={playingId}
              handlePlay={handlePlay}
            />
          </div>
        ))
      }
    </section>
  );
}

import {
  RiThumbUpLine,
  RiThumbDownLine
} from 'react-icons/ri';
import { Button } from '@nextui-org/button';
import { useAppStore } from '@/zustand/store';
import { useRef, useEffect } from 'react';
import { FaPlay, FaStop } from 'react-icons/fa';
import audioSvg from '@/assets/svgs/audio.svg';
import {useState} from 'react'
import Image from 'next/image';

export default function Chat() {
  const { chatContent, interimChat } = useAppStore();
  const messageEndRef = useRef(null);
  const [playingId, setPlayingId] = useState('')
  const audioRef = useRef(null)

  useEffect(() => {
    messageEndRef.current.scrollIntoView({
      behavior: "smooth",
      block: 'center',
      inline: 'nearest'
    })
  }, [chatContent])

  function handleEnded() {
    setPlayingId('');
  }

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

  return (
    <div className={`flex flex-col gap-5 overflow-y-scroll min-h-25`}>
      {
        [...chatContent, interimChat].map((line) => {
          if (line && line.hasOwnProperty('from') && line.from === 'character') {
            return (
              <div
                key={line.hasOwnProperty('timestamp') ? line.timestamp: 0}
                className="flex flex-col md:flex-row self-start items-start md:items-stretch"
              >
                <p className={"w-fit max-w-[450px] py-2 px-5 font-light flex-none rounded-3xl md:mr-3 rounded-bl-none bg-real-blue-500/20 whitespace-pre-wrap"}>{line.content}</p>
                <div><Button
                  isIconOnly
                  aria-label="thumb up"
                  radius="full"
                  variant="light"
                  className="text-white/50 hover:text-white hover:bg-button min-w-fit md:min-w-10 md:h-10"
                >
                  <RiThumbUpLine size="1.5em"/>
                </Button>
                <Button
                  isIconOnly
                  aria-label="thumb down"
                  radius="full"
                  variant="light"
                  className="text-white/50 hover:text-white hover:bg-button min-w-fit md:min-w-10 md:h-10"
                >
                  <RiThumbDownLine size="1.5em"/>
                </Button>
                </div>
              </div>
            );
          } else if (line && line.hasOwnProperty('from') && line.from === 'user') {
            return (
              <div
                key={line.timestamp}
                className="self-end"
              >
                {!line.audioUrl && <p className={"w-fit max-w-[450px] py-2 px-5 font-light flex-none rounded-3xl rounded-br-none bg-real-blue-500/50 whitespace-pre-wrap"}>{line.content}</p>}
                 {line.audioUrl &&   
                    <div className="flex justify-center mt-1 relative h-10">
                    <audio ref={audioRef} preload="none" onEnded={handleEnded}>
                      Your browser does not support the audio tag.
                    </audio> 
                    <Image
                      src={audioSvg}
                      alt=""
                      className="w-auto"
                    />
                    <Button
                      isIconOnly
                      variant="bordered"
                      radius="full"
                      color="white"
                      className="opacity-70 absolute hover:opacity-80 hover:scale-105 hover:-translate-y-0.5 transform transition-transform"
                      onPress={() => handlePlay(line.timestamp, line.audioUrl)}
                    >
                    {playingId !== line.timestamp ? (
                      <FaPlay/>
                    ) : (
                      <FaStop/>
                    )}
                    </Button>
                  </div>
                
                }
                </div>)
          } else if (line && line.hasOwnProperty('from') && line.from === 'message') {
            return (
              <div
                key={line.timestamp}
                className="self-center"
              >
                <p className="text-tiny text-real-silver-500">{line.content}</p>
              </div>
            )
          }
        })
      }
      <div ref={messageEndRef}></div>
    </div>
  );
}

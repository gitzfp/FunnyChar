import {
  RiThumbUpLine,
  RiThumbDownLine
} from 'react-icons/ri';
import { Button } from '@nextui-org/button';
import { useAppStore } from '@/zustand/store';
import { useRef, useEffect, useState } from 'react';
import { FaPlay, FaStop } from 'react-icons/fa';
import audioSvg from '@/assets/svgs/audio.svg';
import Image from 'next/image';

export default function Chat() {
  const { chatContent} = useAppStore();
  const messageEndRef = useRef(null);
  const [playingId, setPlayingId] = useState('')
  const audioRef = useRef(null)
  const [expandedId, setExpandedId] = useState('');

  const toggleExpand = (messageId) => {
    setExpandedId(messageId);
  };


  useEffect(() => {
    messageEndRef.current.scrollIntoView({
      behavior: "smooth",
      block: 'center',
      inline: 'nearest'
    })
    // console.log('Chat消息变化:', chatContent)
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
        [...chatContent].map((line) => {
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
            let speechResult;
            if(line.speechResult && line.speechResult?.NBest?.length > 0){
              speechResult =  line.speechResult.NBest[0]
            }
            return (
              <div
                key={line.timestamp}
                className="self-end"
              >
                {!line.audioUrl && <p className={"w-fit max-w-[450px] py-2 px-5 font-light flex-none rounded-3xl rounded-br-none bg-real-blue-500/50 whitespace-pre-wrap"}>{line.content}</p>}
                 {line.audioUrl &&   
                    <div className="flex flex-col justify-center mt-1 relative h-10">
                      <div className='flex justify-center mt-1 relative h-10'>
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
                      <div className="text-center text-sm font-normal mb-2 mt-2">{line.content}</div>
                    </div>
                }
                {speechResult && (
                    <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded-md shadow-md w-full max-w-md">
                      {/* 评分展示 */}
                      <div className="grid grid-cols-4 gap-2 text-center font-semibold text-sm mb-2">
                        <div>准确度</div>
                        <div>流利度</div>
                        <div>完整度</div>
                        <div>发音得分</div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center mb-2">
                        <div>{speechResult.AccuracyScore}</div>
                        <div>{speechResult.FluencyScore}</div>
                        <div>{speechResult.CompletenessScore}</div>
                        <div>{speechResult.PronScore}</div>
                      </div>

                      {expandedId === line.messageId && (
                        <div className={`transition-all duration-500 ${expandedId === line.messageId ? 'max-h-full' : 'max-h-40'} overflow-hidden`}>
                          <div className="grid grid-cols-3 gap-2">
                            {speechResult.Words.map((word, index) => (
                              <div key={index} className="text-center">
                                <div className="bg-green-200 p-1 rounded-t-md text-green-800 font-semibold text-xs">
                                  {word.Word}<span className="text-xs align-top"> {word.AccuracyScore}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                  {word.Phonemes.map((phoneme, pIndex) => (
                                    <div key={pIndex} className="p-1 bg-green-500 text-white font-semibold text-xs">
                                      {phoneme.Phoneme}
                                      <span className="block text-sm font-normal">{phoneme.AccuracyScore}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-center mt-2">
                        <button onClick={() => toggleExpand(line.messageId)} className="text-blue-500 underline text-sm">
                          {expandedId === line.messageId ? 'Show Less' : 'Show More'}
                        </button>
                      </div>
                    </div>
                  )}
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

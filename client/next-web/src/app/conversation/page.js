'use client';

import { Button } from '@nextui-org/button';
import { Tooltip } from '@nextui-org/tooltip';
import Chat from './_components/Chat';
import HandsFreeMode from './_components/HandsFreeMode';
import TextMode from './_components/TextMode';
import TabButton from '@/components/TabButton';
import Image from 'next/image';
import exitIcon from '@/assets/svgs/exit.svg';
import { BsChatRightText, BsTelephone } from 'react-icons/bs';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/zustand/store';
import lz from 'lz-string';
import { playAudios } from '@/util/audioUtils';

export default function Conversation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isTextMode, setIsTextMode] = useState(true);

  const { character, getAudioList, setCharacter, clearChatContent } =
    useAppStore();
  // Websocket.
  const { socketIsOpen, connectSocket, closeSocket } =
    useAppStore();
  // Media recorder.
  const {
    mediaRecorder,
    connectMicrophone,
    startRecording,
    stopRecording,
  } = useAppStore();
  // Audio player
  const audioPlayerRef = useRef(null);
  const audioQueueRef = useRef(useAppStore.getState().audioQueue);
  const { isPlaying, setIsPlaying, popAudioQueueFront } = useAppStore();
  const { setAudioPlayerRef, stopAudioPlayback } = useAppStore();
  // Web RTC
  const {
    connectPeer,
    closePeer,
    incomingStreamDestination,
    audioContext,
    rtcConnectionEstablished,
  } = useAppStore();
  const { selectedMicrophone, selectedSpeaker } = useAppStore();

  useEffect(
    () =>
      useAppStore.subscribe(
        state => (audioQueueRef.current = state.audioQueue)
      ),
    []
  );

  useEffect(() => {
    const characterString = searchParams.get('character');
    const character = JSON.parse(
      lz.decompressFromEncodedURIComponent(characterString)
    );
    setCharacter(character);
  }, []);

  // Bind current audio player to state ref.
  useEffect(() => {
    setAudioPlayerRef(audioPlayerRef);
  }, []);

  useEffect(() => {
    connectSocket();
  }, [character]);

  useEffect(() => {
    if (mediaRecorder) {
      stopRecording();
    }
    if (rtcConnectionEstablished) {
      closePeer();
    }
    getAudioList()
      .then()
      .then(() => {
        connectPeer().then(() => {
          connectMicrophone();
        });
      });
  }, [selectedMicrophone]);

  // Reconnects websocket on setting change.
  const {
    preferredLanguage,
    selectedModel,
  } = useAppStore();
  useEffect(() => {
    if (!mediaRecorder || !socketIsOpen || !rtcConnectionEstablished) {
      return;
    }
    closeSocket();
    clearChatContent();
    connectSocket();
  }, [
    preferredLanguage,
    selectedModel,
  ]);

  useEffect(() => {
    // The chrome on android seems to have problems selecting devices.
    if (typeof audioPlayerRef.current.setSinkId === 'function') {
      audioPlayerRef.current.setSinkId(selectedSpeaker.values().next().value);
    }
  }, [selectedSpeaker]);

  // Audio Playback
  useEffect(() => {
    if (audioContext, !isPlaying && audioQueueRef.current?.length > 0) {
      playAudios(
        audioContext,
        audioPlayerRef,
        audioQueueRef,
        isPlaying,
        setIsPlaying,
        incomingStreamDestination,
        popAudioQueueFront
      );
    }
  }, [audioContext, audioQueueRef.current?.length]);

  const {disableMic} = useAppStore();

  function handsFreeMode() {
    setIsTextMode(false);
    if (!disableMic) {
    }
  }

  function textMode() {
    setIsTextMode(true);
  }

  const cleanUpStates = () => {
 
    stopAudioPlayback();
    stopRecording();
    closePeer();
    closeSocket();
    clearChatContent();
    setCharacter({});
  };



  return (
    <div className="relative h-screen conversation_container">
      <audio
        ref={audioPlayerRef}
        className="audio-player"
      >
        <source
          src=""
          type="audio/mp3"
        />
      </audio>
          <div className="fixed top-0 w-full bg-background z-10">
            <div className="grid grid-cols-4 gap-5 pt-4 md:pt-5 items-center">
              <div>
                <Tooltip
                  content="Exit"
                  placement="bottom"
                >
                  <Button
                    isBlock
                    isIconOnly
                    radius="full"
                    className="hover:opacity-80 h-8 w-8 md:h-12 md:w-12 ml-5 mt-1 bg-button"
                    onPress={() => {
                      router.push('/');
                      cleanUpStates();
                    }}
                  >
                    <Image
                      priority
                      src={exitIcon}
                      alt="exit"
                    />
                  </Button>
                </Tooltip>
              </div>
              <div className="col-span-2 flex gap-5 border-2 rounded-full p-1 border-tab">
                <TabButton
                  isSelected={isTextMode}
                  handlePress={textMode}
                  className="min-w-fit h-fit py-2 md:min-w-20 md:h-11 md:py-4"
                >
                  <span className="md:hidden">
                    <BsChatRightText size="1.2em" />
                  </span>
                  <span className="hidden md:inline">Text</span>
                  <span className="hidden lg:inline">&nbsp;mode</span>
                </TabButton>
                <TabButton
                  isSelected={!isTextMode}
                  handlePress={handsFreeMode}
                  className="min-w-fit h-fit py-2 md:min-w-20 md:h-11 md:py-4"
                >
                  <span className="md:hidden">
                    <BsTelephone size="1.2em" />
                  </span>
                  <span className="hidden md:inline">Hands-free</span>
                  <span className="hidden lg:inline">&nbsp;mode</span>
                </TabButton>
              </div>
            </div>
          </div>
          <div className="h-full -mb-24">
            <div className="h-[104px] md:h-[128px]"></div>
            <div className="w-full px-4 md:px-0 mx-auto md:w-unit-9xl lg:w-[892px]">
              <Chat />
            </div>
            <div className="h-24"></div>
          </div>
          <div className="fixed bottom-0 w-full bg-background">
            <div className="px-4 md:px-0 mx-auto md:w-unit-9xl lg:w-[892px]">
              <HandsFreeMode isDisplay={!isTextMode} />
              <TextMode isDisplay={isTextMode} />
            </div>
          </div>
    </div>
  );
}

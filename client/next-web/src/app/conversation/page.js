'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@nextui-org/button';
import { Tooltip } from '@nextui-org/tooltip';
import Chat from './_components/Chat';
import TextMode from './_components/TextMode';
import TabButton from '@/components/TabButton';
import Image from 'next/image';
import exitIcon from '@/assets/svgs/exit.svg';
import { BsChatRightText, BsTelephone } from 'react-icons/bs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/zustand/store';
import lz from 'lz-string';
import { playAudios } from '@/util/audioUtils';
import HandsFreeMode from './_components/HandsFreeMode'; 


export default function Conversation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isTextMode, setIsTextMode] = useState(true);
  const {isHandsFree, setIsHandsFree} = useAppStore();
  const [isAnimating, setIsAnimating] = useState(false); // 新增动画状态

  const { character, getAudioList, setCharacter, clearChatContent } = useAppStore();
  const { socketIsOpen, connectSocket, closeSocket } = useAppStore();
  const { mediaRecorder, startRecording, stopRecording } = useAppStore();
  const audioPlayerRef = useRef(null);
  const audioQueueRef = useRef(useAppStore.getState().audioQueue);
  const { isPlaying, setIsPlaying, popAudioQueueFront } = useAppStore();
  const { setAudioPlayerRef, stopAudioPlayback } = useAppStore();
  const { connectPeer, closePeer, incomingStreamDestination, audioContext, rtcConnectionEstablished } = useAppStore();
  const { selectedMicrophone, selectedSpeaker } = useAppStore();

  useEffect(() => {
    useAppStore.subscribe((state) => (audioQueueRef.current = state.audioQueue));
  }, []);

  useEffect(() => {
    const characterString = searchParams.get('character');
    const character = JSON.parse(lz.decompressFromEncodedURIComponent(characterString));
    setCharacter(character);
  }, []);

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
    getAudioList().then(() => {
      connectPeer().then(() => {});
    });
  }, [selectedMicrophone]);

  const { preferredLanguage, selectedModel } = useAppStore();
  useEffect(() => {
    if (!mediaRecorder || !socketIsOpen || !rtcConnectionEstablished) {
      return;
    }
    closeSocket();
    clearChatContent();
    connectSocket();
  }, [preferredLanguage, selectedModel]);

  useEffect(() => {
    if (typeof audioPlayerRef.current.setSinkId === 'function') {
      audioPlayerRef.current.setSinkId(selectedSpeaker.values().next().value);
    }
  }, [selectedSpeaker]);

  useEffect(() => {
    if (audioContext && !isPlaying && audioQueueRef.current?.length > 0) {
      playAudios(audioContext, audioPlayerRef, audioQueueRef, isPlaying, setIsPlaying, incomingStreamDestination, popAudioQueueFront);
    }
  }, [audioContext, audioQueueRef.current?.length]);

    useEffect(() => {
    if (isAnimating) {
      // Play sound
      const audio = new Audio('call.m4a');
      audio.play();

      // Set a listener for when the audio ends
      audio.onended = () => {
        setIsAnimating(false); // 动画结束
        setIsHandsFree(true); // 进入HandsFree模式，显示HeygenAvatar
        startRecording();
      };

      // Optionally, you can add a visual animation here
      // For example, you could add a CSS class to trigger a CSS animation
    }
  }, [isAnimating]);

  function handsFreeMode() {
    setIsTextMode(false)
    setIsAnimating(true); // 开始动画
    setTimeout(() => {
      setIsAnimating(false); // 动画结束
      setIsHandsFree(true); // 进入HandsFree模式，显示HeygenAvatar
      startRecording()
    }, 3000); // 假设动画持续3秒
  }

  function textMode() {
    setIsHandsFree(false);
    setIsTextMode(true);
    stopRecording()
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
      <audio ref={audioPlayerRef} className="audio-player">
        <source src="" type="audio/mp3" />
      </audio>
      <div className="fixed top-0 w-full bg-background z-10">
        <div className="grid grid-cols-4 gap-5 pt-4 md:pt-5 items-center">
          <div>
            <Tooltip content="Exit" placement="bottom">
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
                <Image priority src={exitIcon} alt="exit" />
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
        <div className="h-[80px] md:h-[100px]"></div>
        <div className="w-full md:px-0 mx-auto md:w-unit-9xl lg:w-[892px]">
          {isAnimating && (
            <div className="flex justify-center items-center h-64 relative">
              <div className="ripple-container">
                <div className="ripple-effect"></div>
              </div>
              <p className="text-lg font-semibold text-gray-700">Connecting...</p>
            </div>
          )}
          {!isHandsFree && !isAnimating && <Chat />} {/* 隐藏 Chat 组件 */} 
        </div>
      </div>
      <div className="fixed bottom-0 w-full bg-background">
        <div className="md:px-0 mx-auto md:w-unit-9xl lg:w-[892px]">
          <TextMode isDisplay={!isHandsFree}/>
        </div>
      </div>
      {!isAnimating && isHandsFree && <div className="fixed top-0 w-full h-full bg-background">
          <HandsFreeMode/>
      </div>}
    </div>
  );
}

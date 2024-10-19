import React, { useState, useRef, useEffect } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar";
import { useAppStore } from '@/zustand/store';

const HeygenAvatar = () => {
  const videoRef = useRef(null);
  const [avatar, setAvatar] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);

  const [speakText, setSpeakText] = useState('');
  const { chatContent, startRecording, oneSentenceText} = useAppStore();
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const length = chatContent?.length;
    if (
      length > 0 &&
      chatContent[length - 1].from === 'character' &&
      chatContent[length - 1].isEnd
    ) {
      const newChatItem = chatContent[length - 1];
      const newContent = newChatItem.content;
      if (!isSpeaking) {
        setSpeakText(newContent);
      }
    }
    console.log(speakText, "=======>数字人说话>>>>>>>>>>", chatContent);
  }, [chatContent, isSpeaking]);

  // Helper function to fetch access token
  const fetchAccessToken = async () => {
    const apiKey = 'ODA0YWFhODg4YmI5NDg5OTlmNmMzZWUyMWMwM2ZjNTAtMTcyOTMyOTE4Ng==';
    const response = await fetch(
      "https://api.heygen.com/v1/streaming.create_token",
      {
        method: "POST",
        headers: { "x-api-key": apiKey },
      }
    );

    const { data } = await response.json();
    return data.token;
  };

  // Initialize streaming avatar session
  const initializeAvatarSession = async () => {
    console.log("Initializing avatar session...");
    const token = await fetchAccessToken();
    console.log("Token fetched:", token);

    const avatarInstance = new StreamingAvatar({ token });
    console.log("Avatar instance created");

    const session = await avatarInstance.createStartAvatar({
      quality: AvatarQuality.High,
      avatarName: "Wayne_20240711",
      knowledgeBase: "Difficult Conversation Roleplay Partner",
    });

    console.log("Session created:", session);
    setSessionData(session);
    setAvatar(avatarInstance);

    avatarInstance.on(StreamingEvents.STREAM_READY, handleStreamReady);
    avatarInstance.on(StreamingEvents.STREAM_DISCONNECTED, handleStreamDisconnected);
  };

  // Handle when avatar stream is ready
  const handleStreamReady = (event) => {
    setIsSessionActive(true); // 在这里设置为 true
    console.log("Stream ready event received:", event);
    if (event.detail && videoRef.current) {
      videoRef.current.srcObject = event.detail;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play().catch(console.error);
      };
    } else {
      console.error("Stream is not available");
    }
  };

  // Handle stream disconnection
  const handleStreamDisconnected = () => {
    console.log("Stream disconnected");
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsSessionActive(false);
  };

  // End the avatar session
  const terminateAvatarSession = async () => {
    if (!avatar || !sessionData) return;

    await avatar.stopAvatar();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setAvatar(null);
    setSessionData(null);
    setIsSessionActive(false);
  };

  useEffect(() => {
    handleSpeak(oneSentenceText);
  }, [oneSentenceText]);

  // Handle speaking event
  const handleSpeak = async (text) => {
    if (avatar && text) {
      setIsSpeaking(true);
      await avatar.speak({ text: text, task_type: TaskType.TALK });
      console.log('数字人将说：', text);
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    const audio = new Audio('call.m4a');
    audio.play();
    startRecording();
    initializeAvatarSession();
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center gap-4">
      <div className="w-full h-full max-w-3xl bg-black rounded-lg overflow-hidden relative">
        {isSessionActive ? (
          <video ref={videoRef} className="h-full bg-black" autoPlay playsInline />
        ) : (
           <div className="flex items-center justify-center h-screen bg-black">
            <div className="text-center">
              {/* 提示文字 */}
              <div className="text-white text-2xl mb-4 animate-pulse">
                Connecting call...
              </div>
              {/* 加载动画 */}
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white"></div>
              </div>
            </div>
          </div> 
        )}
      </div>
    </div>
  );
};

export default HeygenAvatar;
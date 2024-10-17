import React, { useState, useRef, useEffect } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
} from "@heygen/streaming-avatar";
import { useAppStore } from '@/zustand/store';

const HeygenAvatar = () => {
  const videoRef = useRef(null);
  const [avatar, setAvatar] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
   const { oneSentenceText } = useAppStore();

  // Helper function to fetch access token
  const fetchAccessToken = async () => {
    const apiKey = 'ZWIzNDAxZDY2MTZkNGViNDhkYmFlMmM3MDBkNTU5ZTUtMTcyOTEzMzk2NQ==';
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
    const token = await fetchAccessToken();
    const avatarInstance = new StreamingAvatar({ token });

    const session = await avatarInstance.createStartAvatar({
      quality: AvatarQuality.High,
      avatarName: "default",
    });

    console.log("Session data:", session);
    setSessionData(session);
    setAvatar(avatarInstance);
    setIsSessionActive(true);

    avatarInstance.on(StreamingEvents.STREAM_READY, handleStreamReady);
    avatarInstance.on(StreamingEvents.STREAM_DISCONNECTED, handleStreamDisconnected);
  };

  // Handle when avatar stream is ready
  const handleStreamReady = (event) => {
    if (event.detail && videoRef.current) {
      videoRef.current.srcObject = event.detail;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(console.error);
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
    handleSpeak(oneSentenceText)
  }, [oneSentenceText])

  // Handle speaking event
  const handleSpeak = async (oneSentenceText) => {
    if (avatar && oneSentenceText) {
      await avatar.speak({ text: oneSentenceText });
      setUserInput(""); // Clear input after speaking
    }
  };

  useEffect(() => {
    setTimeout(() => {
        initializeAvatarSession()
    }, 1000)
  }, [])

  return (
    <div className="h-full flex flex-col items-center gap-4 p-4">
      <div className="h-full max-w-3xl bg-black rounded-lg overflow-hidden">
        <video ref={videoRef} className="h-full bg-black" autoPlay playsInline  />
      </div>
    </div>
  );
};

export default HeygenAvatar;
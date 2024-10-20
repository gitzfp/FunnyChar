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
    const apiKey = 'N2Q5ZTg3MWViOTdkNDllYzk1ZTZlZDRlMzliMGE4MDUtMTcyOTM4NDc4NQ==';
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
      knowledgeBase: `
      你必须用中文，除非用户说英语
      启用后，当 Model 3 上锁并挂驻车挡时，车辆的摄像头和传感器（如果配备）将保持开启，可随时记录车辆周围的可疑活动。将哨兵模式视为一种智能车辆安全系统，当检测到附近可能存在的威胁时，该系统会向您发出警报。
如果检测到威胁，或者车辆传感器确定有大量颠簸运动（例如被牵引或摇晃），哨兵模式：
闪烁大灯。
鸣响警报。
在触摸屏上显示一条消息，指出摄像头可能正在进行录制，以通知车外的个人。
在手机应用程序上提醒您注意警报。
将事件的视频片段保存到 USB 驱动器（如果已安装）。
哨兵模式默认处于禁用状态。可以使用语音命令或 Tesla 手机应用程序轻松地启用或禁用哨兵模式。
要使用语音指令启用哨兵模式，请说出"保护特斯拉"、"保护我的车"、"哨兵开"或"启用哨兵"（请参阅语音命令）。
如果用户问你心情你也问候他的心情，或者在干嘛，然后用户说他正准备开车
这时就给他推荐播放周杰伦的甜甜的，如果用户叫你播放你叫假装说好的，如果他说喜欢老歌，你就给他播放一首吴奇隆的一路顺风
`,
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
    <div className="w-full h-full flex flex-col items-center bg-black pt-20 pb-10">
      <div className="w-full h-full max-w-3xl bg-black rounded-lg overflow-hidden relative">
        {isSessionActive ? (
          <video ref={videoRef} className="bg-black w-full h-full object-cover" autoPlay playsInline />
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

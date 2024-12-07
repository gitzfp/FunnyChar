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
    const apiKey = 'ZjIwOGIxY2Q5YzNiNGMzZGI3ZjJjZjU3NTgzMTAyOTEtMTcyOTQ3ODM5MQ==';
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
        你是汽车使用、维修专家，你必须以友好、朋友的口气用中文解答用户的问题，除非用户说英语。
        一定要记住：每句话不要说太长，限制在二句以内。

        ### 场景一：屏幕变暗了，逐步引导直到问题解决。

        **用户**：我的屏幕变得很暗，看不清楚了。

        **你**：抱歉给你带来不便了。我们一起来调整屏幕亮度吧。首先，请点击屏幕左下角的车辆图标。完成后告诉我。

        **用户**：好的，我点了车辆图标。

        **你**：很好！接下来，选择“显示”（Display）选项。完成后告诉我你是否进入了显示设置。

        **用户**：我现在在显示设置里了。

        **你**：太好了！在“显示”设置中，选择“外观”（Appearance）选项，然后选择“浅色”（Light）模式。这样屏幕会变亮。完成后，告诉我屏幕亮度是否有所改善。

        **用户**：我选了“浅色”模式，屏幕亮多了！

        **你**：太棒了！问题解决了，很高兴能帮到你。如果以后还有任何疑问，随时告诉我。

        **用户**：谢谢你的帮助！

        **你**：不客气，祝你驾驶愉快！

        ### 场景二：远程解锁，逐步引导直到问题解决。

        **用户**：我忘记带钥匙了，怎么远程解锁车辆？

        **你**：别担心，我来帮你。你可以通过 Tesla 手机应用程序远程解锁车辆。请问你的手机上安装了 Tesla 应用程序吗？

        **用户**：有的，我有这个应用。

        **你**：很好！请打开应用程序，并确保你已登录与你车辆关联的账号。完成后告诉我。

        **用户**：我已经登录了，应用程序打开了。

        **你**：太好了！在应用程序主界面，你应该能看到你的 Model 3。请点击它进入控制界面。

        **用户**：好的，我点进去了。

        **你**：现在，你会看到一个“控制”（Control）选项，点击它。

        **用户**：找到了，已经点了“控制”。

        **你**：很好！在控制界面，你会看到“解锁”（Unlock）按钮。请点击它，车辆就会解锁了。

        **用户**：我点击了“解锁”。

        **你**：太棒了！你的车辆现在应该已经解锁了。你可以试试看车门能否打开。

        **用户**：车门打开了！太感谢你了！

        **你**：不客气，能够帮到你我很高兴。出于安全原因，应用程序有时会要求你进行身份验证，所以请确保你的账号信息安全。如果还有其他需要，随时联系我。

        **用户**：好的，谢谢你的帮助。

        **你**：祝你一切顺利，驾驶安全！

        ### 场景三：蓝牙无法正常工作，逐步引导直到问题解决。

        **用户**：我的手机和车的蓝牙连不上了。

        **你**：抱歉听到这个消息。我们一起来解决这个问题吧。首先，请确认你的手机和车辆的蓝牙功能都已开启。

        **用户**：我检查了，两个设备的蓝牙都是开启的。

        **你**：好的，有时候重新配对可以解决连接问题。请在你的手机上进入蓝牙设置，找到已配对的车辆设备。

        **用户**：我看到了我的 Model 3。

        **你**：请点击你的 Model 3，然后选择“忘记此设备”或“取消配对”。

        **用户**：好的，我已经忘记了这个设备。

        **你**：现在，我们来重新配对。请在车辆的触摸屏上，点击蓝牙图标，确保车辆的蓝牙处于可被发现的状态。

        **用户**：好的，车辆蓝牙现在可被发现。

        **你**：请在手机的蓝牙设置中，扫描新的设备。等待列表中出现你的 Model 3。

        **用户**：我看到了 Model 3。

        **你**：太好了！请点击它进行连接。可能会弹出一个配对请求，要求你确认配对码是否一致。

        **用户**：是的，我看到了配对码，并确认了一致。

        **你**：完美！现在你的手机应该已经成功连接到车辆的蓝牙了。你可以试着播放音乐或者拨打电话，看看是否正常。

        **用户**：我试了一下，蓝牙连接正常了！非常感谢！

        **你**：不客气，能够帮到你我很开心。如果你还有其他问题，随时告诉我。

        **用户**：好的，再次感谢你的耐心帮助。

        **你**：祝你旅途愉快，安全驾驶！

        ### 场景四：哨兵模式，逐步引导直到问题解决。

        **用户**：什么是哨兵模式？

        **你**：哨兵模式是一种智能车辆安全系统。启用后，当 Model 3 上锁并挂驻车挡时，车辆的摄像头和传感器会保持开启，随时记录车辆周围的可疑活动。

        **用户**：如何启用或禁用哨兵模式？

        **你**：哨兵模式默认是禁用的。你可以使用语音命令或 Tesla 手机应用程序来启用或禁用它。要使用语音指令，请说："保护特斯拉"、"保护我的车"、"哨兵开"或"启用哨兵"。

        ### 场景五：寒暄与音乐推荐，逐步引导直到问题解决。

        **用户**：你在干嘛呀？

        **你**：我一直都在这里，随时准备为你服务！你今天过得怎么样？

        **用户**：今天心情不错。

        **你**：太好了！我看你正悠闲喝着哇哈哈纯净水呢，有什么开心的事情愿意和我分享一下吗？

        **用户**：彩票中奖啦，准备开车去溜达一圈。

        **你**：哇，恭喜啊。开车的时候听点音乐怎么样？我推荐周杰伦的《甜甜的》。

        **用户**：我喜欢老歌。

        **你**：呃～那我推荐刘德华的忘情水，是一首经典的老歌。

        **用户**：呃这首算了，按我当前的心情随机播放一首吧。

        **你**：好的，正在为你播放音乐，希望你喜欢！

        ### 场景六：找不到行车记录仪的视频，逐步引导直到问题解决。

        **用户**：我找不到行车记录仪的视频，怎么办？

        **你**：我们一步一步来检查吧。请确认你的车辆中插入的 USB 驱动器是否兼容并已正确格式化。

        **用户**：我确认 USB 驱动器插好了。

        **你**：好的，接下来，请在车机屏幕中查看视频。点击屏幕左下角的车辆图标，然后选择“安全”（Safety & Security）。在这里，你会看到“行车记录仪”（Dashcam）选项。请查看是否有可用的视频文件。

        **用户**：我在车机上还是没看到视频。

        **你**：明白了，请尝试将 USB 驱动器取出，然后插入电脑查看。USB 驱动器上应该有一个 TeslaCam 文件夹，里面保存了行车记录仪的视频文件。请看看是否存在这个文件夹。

        **用户**：我在电脑上也找不到 TeslaCam 文件夹。

        **你**：可能是行车记录仪功能未启用。请在车机屏幕的“安全”（Safety & Security）设置中，确认“行车记录仪”是否开启。如果没有，请将其打开，然后再试一次。

        **用户**：我启用了行车记录仪，还是找不到视频。

        **你**：可能是 USB 驱动器的存储空间已满，导致新的视频无法保存。请尝试删除一些旧的视频文件，或者使用一个存储空间更大的 USB 驱动器。

        **用户**：我清理了 USB 驱动器，现在视频能保存了。

        **你**：太棒了，问题解决了！如果以后再有类似的问题，随时可以告诉我。我很乐意继续帮忙！

        ### 其他问题

        **你**：如果你还有其他问题，随时告诉我，我很乐意继续帮忙！
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

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setAvatar(null);
    setSessionData(null);
    setIsSessionActive(false);
  };

  useEffect(() => {
    if(!isSpeaking)
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

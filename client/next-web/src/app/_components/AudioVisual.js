import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/zustand/store';

const AudioVisualizer = () => {
  const { oneSentenceText } = useAppStore();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [videoSrc, setVideoSrc] = useState(''); // 存储当前播放的视频源
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);

  // 更新视频源和播放状态
  useEffect(() => {
    if (oneSentenceText) {
      if (oneSentenceText.includes('在干嘛呀')) {
        setVideoSrc('1.mp4');
        setMuted(false);
        setIsSpeaking(true);
      } else if (oneSentenceText.includes('心情不错')) {
        setVideoSrc('2.mp4');
        setMuted(false);
        setIsSpeaking(true);
      } else if (oneSentenceText.includes('准备开车')) {
        setVideoSrc('3.mp4');
        setMuted(false);
        setIsSpeaking(true);
      } else if (oneSentenceText.includes('我喜欢老歌')) {
        setVideoSrc('4.mp4');
        setMuted(false);
        setIsSpeaking(true);
      } else if (oneSentenceText.includes('随机播放')) {
        setVideoSrc('5.mp4');
        setMuted(false);
        setIsSpeaking(true);
      } else {
        setVideoSrc(''); // 没有匹配的内容时，不播放视频
        setMuted(true);
        setIsSpeaking(false);
      }
    }
  }, [oneSentenceText]);

  // 控制视频的播放和暂停
  useEffect(() => {
    if (videoRef.current) {
      if (isSpeaking && videoSrc) {
        videoRef.current.play().catch((error) => {
          console.error('自动播放失败：', error);
        });
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0; // 重置视频到起始位置
      }
    }
  }, [videoSrc]);

  // 处理视频播放结束事件
  const handleVideoEnd = () => {
    setIsSpeaking(false); // 设置为不再播放状态
    setVideoSrc(''); // 清除视频源
    setMuted(true); // 恢复静音状态
  };

  return (
    <div className="flex items-center justify-center bg-black h-full">
        {videoSrc && <video
        ref={videoRef}
        className="rounded-lg h-full w-auto max-w-full"
        src={videoSrc || '1.mp4'} // 根据状态动态加载视频
        muted={!videoSrc}
        loop={false}
        playsInline
        autoPlay={true}
        onEnded={handleVideoEnd} // 监听播放结束事件
      />}
      {!videoSrc &&  <video
        className="rounded-lg h-full w-auto max-w-full"
        src={'Ten-agent.mp4'} // 根据状态动态加载视频
        muted={false}
        loop={true} // 只有在 speaking 时循环播放
        playsInline
        autoPlay={true}
        onEnded={handleVideoEnd} // 监听播放结束事件
      />}
    </div>
  );
};

export default AudioVisualizer;
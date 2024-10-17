import { useAppStore } from '@/zustand/store';
import { useState, useEffect, useRef } from 'react';
import HeygenAvatar from '../../_components/HeygenAvatar';
import DIDAvatar from '../../_components/DIDAvatar';
import OpenAI from 'openai';

const openai = new OpenAI({
  dangerouslyAllowBrowser: true,
  apiKey: 'sk-b9bbfde1f3fb4961aeb3aa0d1e333d9c', // 请在环境变量中设置API密钥
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export default function HandsFreeMode() {
  const [stream, setStream] = useState(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [recognitionResult, setRecognitionResult] = useState('');
  const { character } = useAppStore();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const getMedia = async () => {
      const constraints = {
        video: { facingMode: isFrontCamera ? 'user' : 'environment' },
      };
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Error accessing media devices.', err);
      }
    };

    getMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isFrontCamera]);

  useEffect(() => {
    const interval = setInterval(() => {
      captureAndIdentify();
    }, 6000); // 每6秒进行一次识别

    return () => clearInterval(interval); // 清除定时器以防止内存泄漏
  }, [videoRef]);

  const toggleCamera = () => {
    setIsFrontCamera(prev => !prev);
    captureAndIdentify()
  };

  const captureAndIdentify = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const imageData = canvasRef.current.toDataURL('image/jpeg');
      const base64Image = imageData.split(',')[1]; // 去掉前缀

      try {
        // 调用 OpenAI API 进行图像识别
        const response = await openai.chat.completions.create({
          model: 'qwen-vl-max-latest',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
                { type: 'text', text: '请仔细分析你看到所有东西，并且指出来，如果画面有人脸，请顺便指出他的心情' },
              ],
            },
          ],
        });
        const result = response.choices[0].message.content;
        setRecognitionResult(result);
      } catch (error) {
        console.error('Error during image recognition:', error);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen">
     <div className="flex-1">
      {character.name === 'MetaServe-1' ? <DIDAvatar /> : <HeygenAvatar />}
      </div>
      {character.name === 'MetaServe-1' && <div className="flex-1 relative">
        {recognitionResult && (
          <div className="absolute top-0 left-1/3 transform -translate-x-1/2 bg-white bg-opacity-80 text-black p-4 rounded shadow-lg">
            {recognitionResult}
          </div>
        )}
        <video
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          ref={videoRef}
        />
        <canvas ref={canvasRef} className="hidden" width={640} height={480}></canvas>
        <button
          className="absolute bottom-4 right-4 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={toggleCamera}
        >
          切换摄像头
        </button>
      </div>}
    </div>
  );
}
import React, { useEffect, useRef, useState } from 'react';
import * as sdk from '@d-id/client-sdk';
import { useAppStore } from '@/zustand/store';

const DIDAvatar = (props) => {
  // 1. 定义状态和引用
  const [agentManager, setAgentManager] = useState(null);
  const [connectionLabel, setConnectionLabel] = useState('');
  const [answersContent, setAnswersContent] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const videoElementRef = useRef(null);
  const { oneSentenceText } = useAppStore();

  let srcObject = null;

  // 2. 定义Agent ID和认证信息
  const agentId = 'agt_YaFE0fm3';

  // 请确保不要在客户端代码中硬编码敏感信息，如JWT令牌。最好从服务器安全地获取或使用环境变量。
  const auth = {
    type: 'bearer',
    token: process.env.NEXT_PUBLIC_DID_TOKEN,
  };

  // 3. 定义回调函数
  const callbacks = {
    onSrcObjectReady(value) {
      console.log('onSrcObjectReady():', value);
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = value;
        srcObject = value;
      }
      return srcObject;
    },
    onConnectionStateChange(state) {
      console.log('onConnectionStateChange(): ', state);
      if (state === 'connecting') {
        setConnectionLabel('Connecting...');
        setIsConnected(false);
      } else if (state === 'connected') {
        setConnectionLabel('Online');
        setIsConnected(true);
      } else if (state === 'disconnected' || state === 'closed') {
        setConnectionLabel('');
        setIsConnected(false);
      }
    },
    onVideoStateChange(state) {
      console.log('onVideoStateChange(): ', state);
      if (state === 'STOP') {
        if (videoElementRef.current) {
          videoElementRef.current.muted = true;
          videoElementRef.current.srcObject = undefined;
          videoElementRef.current.src = 'emma_idle.mp4'; // 替换为您的idle视频路径
        }
      } else {
        if (videoElementRef.current) {
          videoElementRef.current.muted = false;
          videoElementRef.current.src = '';
          videoElementRef.current.srcObject = srcObject;
        }
        setConnectionLabel('Online');
      }
    },
    onNewMessage(messages, type) {
      console.log('onNewMessage():', messages, type);
      const lastIndex = messages.length - 1;
      const msg = messages[lastIndex];
      let newContent = '';

      if (msg.role === 'assistant' && messages.length !== 1) {
        if (type === 'answer') {
          newContent = `${timeDisplay()} - [${msg.role}] : ${msg.content} `;
          // 添加评分按钮
          // 注意：在React中，我们需要使用状态来管理事件处理
        }
      } else {
        newContent = `${timeDisplay()} - [${msg.role}] : ${msg.content} `;
      }

      setAnswersContent((prevContent) => prevContent + newContent + '\n');
    },
    onError(error, errorData) {
      setConnectionLabel('Something went wrong :(');
      console.log('Error:', error, 'Error Data', errorData);
    },
  };

  // 4. 定义流选项
  const streamOptions = { compatibilityMode: 'auto', streamWarmup: true };

  // 5. 定义生命周期钩子和事件处理函数
  useEffect(() => {
    const initializeAgentManager = async () => {
      if (agentId === '' || auth.token === '') {
        setConnectionLabel('Missing agentID and auth.token variables');
        console.error('Missing agentID and auth.token variables');
        return;
      }

      try {
        const manager = await sdk.createAgentManager(agentId, {
          auth,
          callbacks,
          streamOptions,
        });
        console.log('sdk.createAgentManager()', manager);
        setAgentManager(manager);

        // 连接代理
        manager.connect();
        console.log('agentManager.connect()');
      } catch (error) {
        console.error('Error initializing agentManager:', error);
      }
    };
    initializeAgentManager();
  }, []); // 仅在组件挂载时运行一次

  useEffect(() => {
     // 处理聊天
    const chat = (chatText) => {
        const val = chatText;
        if (agentManager && val !== '') {
        agentManager.chat(val);
        console.log('agentManager.chat()');
        setConnectionLabel('Thinking...');
        }
    };
    chat(oneSentenceText)
  }, [oneSentenceText])


  // 处理讲话
  const speak = (val) => {
    alert('讲话：'+val)
    if (val !== '' && val.length > 2) {
      agentManager.speak({
        type: 'text',
        input: val,
      });
      
      console.log(`agentManager.speak("${val}")`);
      setConnectionLabel('Streaming...');
    }
  };

  // 处理重连
  const reconnect = () => {
    console.log('clicked');
    agentManager.reconnect();
    console.log('agentManager.reconnect()');
  };

  // 时间显示函数
  const timeDisplay = () => {
    const currentTime = new Date();
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const seconds = currentTime.getSeconds().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}:${seconds}`;
    return formattedTime;
  };

  return (
    <div className="relative">
      <div className="w-full max-w-md mx-auto">
        <div className="relative">
          <video
            id="videoElement"
            ref={videoElementRef}
            autoPlay
            playsInline
            className="w-full rounded-lg shadow-lg"
          ></video>
          {connectionLabel && (
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              {connectionLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DIDAvatar;
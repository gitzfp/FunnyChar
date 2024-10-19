import { v4 as uuidv4 } from 'uuid';
import { getWsServerUrl } from '@/util/urlUtil';
import { languageCode } from '@/zustand/languageCode';

export const createWebsocketSlice = (set, get) => ({
  socket: null,
  socketIsOpen: false,

  sendOverSocket: (data) => {
    if (get().socket && get().socket.readyState === WebSocket.OPEN) {
      get().socket.send(data);
      console.log('message sent to server');
    } else {
      console.log('tries to send message to server but socket not open.');
    }
  },

  socketOnMessageHandler: (event) => {
    if (typeof event.data === 'string') {
      const message = event.data;
      if (message === '[end]\n' || message.match(/\[end=([a-zA-Z0-9]+)]/)) {
        const messageIdMatches = message.match(/\[end=([a-zA-Z0-9]+)]/);
        if (messageIdMatches) {
          const messageId = messageIdMatches[1];
          const params = new URLSearchParams(message.substring(message.indexOf('?')));
          const text = params.get('text');
          const isEnd = params.get('isEnd') === 'True';  // 将字符串 'true' 转换为布尔值 true
          const currentState = get();
          console.log(params.get('isEnd'),"收到参数:"+text)
          const appendOrUpdate = params.get('appendOrUpdate');
          if(params.get('from')){
              currentState.setSender(params.get('from')); 
          }
         // 追加或更新聊天内容
          currentState.appendChatContent(messageId, {
            text,
            appendOrUpdate,
            isEnd: isEnd
          });
        }
      } else if(message.startsWith('[+transcript_audio]')) {
         try{
            // 使用正则表达式提取参数值
            const params = new URLSearchParams(message.substring(message.indexOf('?')));
            const text = params.get('text');
            const audioUrl = params.get('audioUrl');
            const messageId = params.get('messageId');
            const speechResult = params.get('speechResult')
            const isEnd = params.get('isEnd') === 'True';  // 将字符串 'true' 转换为布尔值 true
            const currentState = get();

            // 检查是否有中断的消息需要处理
            if (currentState.speechInterim != null) {
                console.log("websocketSlice:","有中断消息，需要处理", message)
                currentState.appendSpeechInterim(text);
            }

            // 设置发送者和处理消息内容
            currentState.setSender('user');
            if(params.get('from')){
              currentState.setSender(params.get('from')); 
            }
            console.log(isEnd,"...websocketSlice=收到[+transcript_audio]消息:", message,messageId)
            // 追加或更新聊天内容
            currentState.appendChatContent(messageId, {
              text,
              audioUrl,
              speechResult: speechResult ? JSON.parse(speechResult) : "",
              isEnd
            });
            // 清除临时语音内容
            currentState.clearSpeechInterim(); 
         }catch(err){
            console.log("捕获到错误消息", err)
         }
      } 
    } else {
      console.log(get().shouldPlayAudio, 'should not play audio', get().isMute);
      // binary data
      if (!get().shouldPlayAudio || get().isMute) {
        return;
      }
      console.log('开始播放===========',  event.data.byteLength,)
      get().pushAudioQueue(event.data);
      console.log(
        'audio arrival: ',
        event.data.byteLength,
        ' bytes, speaker: ',
        get().selectedSpeaker.values().next().value,
        ' mute: ',
        get().isMute,
        ' mic: ',
        get().selectedMicrophone.values().next().value,
        ' mute: ',
        get().disableMic,
        ' isPlaying: ',
        get().isPlaying,
        ' isPlaying(player): ',
        get().audioPlayerRef?.current ? !get().audioPlayerRef.current.paused : undefined,
        ' audios in queue: ',
        get().audioQueue.length
      );
    }
  },

  connectSocket: () => {
    if (!get().socket) {
      if (!get().character.hasOwnProperty('character_id')) {
        return;
      }
      const sessionId = uuidv4().replace(/-/g, '');
      get().setSessionId(sessionId);
      const ws_url = getWsServerUrl(window.location.origin);
      const language =
        get().preferredLanguage.values().next().value === 'Auto Detect'
          ? ''
          : languageCode[get().preferredLanguage.values().next().value];
      const ws_path =
        ws_url +
        `/ws/${sessionId}?llm_model=${
          get().selectedModel.values().next().value
        }&platform=web&character_id=${
          get().character.character_id
        }&language=${language}&token=${get().token}`;
      let socket = new WebSocket(ws_path);
      socket.binaryType = 'arraybuffer';
      socket.onopen = () => {
        set({ socketIsOpen: true });
      };
      socket.onmessage = get().socketOnMessageHandler;
      socket.onerror = (error) => {
        console.log(`WebSocket Error: `);
        console.log(error);
      };
      socket.onclose = (event) => {
        console.log('Socket closed');
        set({ socketIsOpen: false });
      };
      set({ socket: socket });
    }
  },
  closeSocket: () => {
    get().socket?.close();
    set({ socket: null, socketIsOpen: false });
  },
  sessionId: '',
  setSessionId: (id) => {
    set({ sessionId: id });
  },

});

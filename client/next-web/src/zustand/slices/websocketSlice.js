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
          get().setMessageId(messageId);
          const params = new URLSearchParams(message.substring(message.indexOf('?')));
          const text = params.get('text');
          const currentState = get();
           // 追加或更新聊天内容
          currentState.appendChatContent(messageId, {
            text
          });
        }
      } else if (message === '[thinking]\n') {
        // Do nothing for now.
        // setIsThinking(true);
      } else if (message.startsWith('[+]You said: ')) {
        // [+] indicates the transcription is done.
        let msg = message.split('[+]You said: ');
        // Interrupted message has no end signal, so manually clear it.
        if (get().speechInterim != null) {
          get().appendChatContent();
        }
        get().setSender('user');
        get().appendInterimChatContent(msg[1]);
        get().appendChatContent();
        get().clearSpeechInterim();
      } else if (message.startsWith('[=]' || message.match(/\[=([a-zA-Z0-9]+)]/))) {
        // [=] or [=id] indicates the response is done
        get().appendChatContent();
      } else if (message.startsWith('[+&]')) {
        let msg = message.split('[+&]');
        get().appendSpeechInterim(msg[1]);
      } else if(message.startsWith('[+transcript_audio]')) {
         try{
            // 使用正则表达式提取参数值
            console.log("webcoketSlice收到消息:", message)
            const params = new URLSearchParams(message.substring(message.indexOf('?')));
            const text = params.get('text');
            const audioUrl = params.get('audioUrl');
            const messageId = params.get('messageId');
            const speechResult = params.get('speechResult')
            const currentState = get();

            // 检查是否有中断的消息需要处理
            if (currentState.speechInterim != null) {
                currentState.appendChatContent();
            }

            // 设置发送者和处理消息内容
            currentState.setSender('user');
            if(params.get('from')){
              currentState.setSender(params.get('from')); 
            }
            currentState.appendInterimChatContent(text);

            // 追加或更新聊天内容
            currentState.appendChatContent(messageId, {
              text,
              audioUrl,
              speechResult: speechResult ? JSON.parse(speechResult) : ""
            });
            // 清除临时语音内容
            currentState.clearSpeechInterim(); 
         }catch(err){
            console.log("捕获到错误消息", err)
         }
      } else {
        get().setSender('character');
        get().appendInterimChatContent(event.data);

        // if user interrupts the previous response, should be able to play audios of new response
        get().setShouldPlayAudio(true);
      }
    } else {
      // binary data
      if (!get().shouldPlayAudio || get().isMute) {
        console.log('should not play audio');
        return;
      }
      console.log('开始播放===========')
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
        get().audioPlayerRef.current ? !get().audioPlayerRef.current.paused : undefined,
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

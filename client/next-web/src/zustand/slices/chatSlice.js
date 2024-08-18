export const createChatSlice = (set, get) => ({
  // interimChat = null means not in text streaming.
  interimChat: null,
  setSender: (sender) => {
      set((state)=>({
          interimChat: state.interimChat ? {...state.interimChat, from: sender} : {from: sender, timestamp: `${Date.now()}`}
      }));
  },
  appendInterimChatContent: (content) => {
      set((state)=> ({
          interimChat: state.interimChat ? {...state.interimChat, content: `${'content' in state.interimChat ? state.interimChat.content : ''}` + content} : {content: content, timestamp: `${Date.now()}`}
      }));
  },

  messageId: '',
  setMessageId: (id) => {
    set({messageId: id});
  },

  chatContent: [],

  appendChatContent: (messageId, messageObj = {}) => {
    set((state) => {
        // 查找是否有相同 messageId 的消息
        const {audioUrl, speechResult} = messageObj
        const chatIndex = state.chatContent.findIndex(chat => chat.messageId === messageId);

        if (chatIndex !== -1) {
            // 更新现有的消息
            const updatedChatContent = [...state.chatContent];
            if (audioUrl) {
                updatedChatContent[chatIndex] = {
                    ...updatedChatContent[chatIndex],
                    text: messageObj.text,
                    audioUrl: audioUrl,
                };
            }
            if(speechResult){
                updatedChatContent[chatIndex] = {
                    ...updatedChatContent[chatIndex],
                    speechResult: speechResult,
                };
            }
            console.log(`收到消息客户端消息:`, {
                chatContent: updatedChatContent,
                interimChat: null,
            })
            return {
                chatContent: updatedChatContent,
                interimChat: null,
            };
        } else {
            // 如果没有找到相同的 messageId，追加新的消息
            const interimChat = { ...state.interimChat, messageId: messageId };

            if (audioUrl) {
                interimChat.audioUrl = audioUrl;
            }
            console.log(`收到服务端消息=====`,interimChat,[...state.chatContent, interimChat])
            return {
                chatContent: [...state.chatContent, interimChat],
                interimChat: null,
            };
        }
    });
},
  appendUserChat: (chat) => {
      set((state) => ({
          chatContent: [...state.chatContent, {timestamp: `${Date.now()}`, from: 'user', content: chat}]
      }));
  },
  appendChatMsg: (chat) => {
    set((state) => ({
      chatContent: [...state.chatContent, { timestamp: `${Date.now()}`, from: 'message', content: chat }]
    }));
  },
  clearChatContent: () => {
      set({chatContent: [], interimChat: null});
  },

  speechInterim: '',
  appendSpeechInterim: (str) => {
    set({speechInterim: get().speechInterim + str});
  },
    clearSpeechInterim: (str) => {
      set({speechInterim: ''});
    }
})

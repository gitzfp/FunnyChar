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

  chatContent: [],

  appendChatContent: (messageId, messageObj = {}) => {
    set((state) => {
        // 查找是否有相同 messageId 的消息
        const {audioUrl, speechResult, text, appendOrUpdate, isEnd} = messageObj
        const chatIndex = state.chatContent.findIndex(chat => chat.messageId === messageId);
        if (chatIndex !== -1) {
            // 更新现有的消息
            const updatedChatContent = [...state.chatContent];
            const updateContent = appendOrUpdate === 'append' ? updatedChatContent[chatIndex].content + text : text;
            if (audioUrl) {
                updatedChatContent[chatIndex] = {
                    ...updatedChatContent[chatIndex],
                    audioUrl: audioUrl,
                };
            }
            if(text){
                updatedChatContent[chatIndex] = {
                    ...updatedChatContent[chatIndex],
                    content: updateContent,
                    isEnd: isEnd
                };
            }
            if(speechResult){
                updatedChatContent[chatIndex] = {
                    ...updatedChatContent[chatIndex],
                    speechResult: speechResult,
                };
            }
           
            return {
                chatContent: updatedChatContent,
                interimChat: null,
            };
        } else {
            // 如果没有找到相同的 messageId，追加新的消息
            const interimChat = { ...state.interimChat, messageId: messageId };
            if(text){
               interimChat.content = text; 
               interimChat.isEnd = isEnd
            }
            if (audioUrl) {
                interimChat.audioUrl = audioUrl;
            }
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

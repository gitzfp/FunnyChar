import { getWsServerUrl, getApiServerUrl } from '@/util/urlUtil';
import hark from 'hark';
import AudioRecorder from './AudioRecorder';
import { v4 as uuidv4 } from 'uuid'; // 导入 UUID 库

export const createRecorderSlice = (set, get) => ({
  // Media recorder
  isRecording: false,
  setIsRecording: v => {
    set({ isRecording: v });
  },
  mediaRecorder: null,
  ws: null,
  timeInte: null,
  transcriptionResult: '', // 存储识别出的文本
  audioBlob: null, // 存储最后的 audioBlob
  clientMsgId: '',

  connectMicrophone: () => {
    const deviceId = get().selectedMicrophone.values().next().value;
    if (get().mediaRecorder) return;
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          deviceId: deviceId ? deviceId : undefined,
        },
      })
      .then(stream => {
        let micStreamSourceNode =
          get().audioContext.createMediaStreamSource(stream);
        let gainNode = get().audioContext.createGain();
        gainNode.gain.setValueAtTime(1.5, get().audioContext.currentTime);
        let delayNode = get().audioContext.createDelay(0.5);
        delayNode.delayTime.value = 0.1;
        let micStreamDestinationNode =
          get().audioContext.createMediaStreamDestination();
        const mediaRecorder = new AudioRecorder(stream);
        micStreamSourceNode
          .connect(gainNode)
          .connect(delayNode)
          .connect(micStreamDestinationNode);
        set({
          mediaRecorder: mediaRecorder,
        });
      })
      .catch(function (err) {
        console.log('An error occurred: ' + err);
        if (err.name === 'NotAllowedError') {
          alert(
            'Permission Denied: Please grant permission to access the microphone and refresh the website to try again!'
          );
        } else if (err.name === 'NotFoundError') {
          alert(
            'No Device Found: Please check your microphone device and refresh the website to try again.'
          );
        }
        get().stopRecording();
      });
  },

  startRecording: () => {
    console.log('start recording1');
    get().startRecognition(); // 启动 WebSocket 连接
  },

  stopRecording: () => {
    console.log('stop recording');
    get().mediaRecorder?.stop();
    get().setIsRecording(false);
    get().mediaRecorder.clear();
    clearInterval(get().timeInte);
    //发送一个 'end' 消息给服务器
    const endMessage = {
      type: 'end',
      clientMsgId: get().clientMsgId
    };
    get().ws?.send(JSON.stringify(endMessage));
    console.log('发送结束消息到服务器:', endMessage);
    // 不要在这里清空 clientMsgId，因为我们需要它发送 'end' 消息
    // set({ transcriptionResult: '', clientMsgId: '' }); // 不要立即清空 clientMsgId
  },

  // WebSocket 处理部分
  startRecognition: () => {
    const clientMsgId = uuidv4(); // 使用 uuidv4 生成唯一的 clientMsgId
    set({ clientMsgId });

    const wsUrl = getWsServerUrl(window.location.origin);
    console.log('WebSocket URL:', wsUrl);  // 打印URL以确认证正确性
    let ws = new WebSocket(`${wsUrl}/sencevoice/transcribe?lang=auto&clientMsgId=${clientMsgId}`);
    set({ ws });

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('WebSocket connection established');
      const { mediaRecorder: record } = get();
      console.log('start recording2, ws is ready');
      record.start();

      let timeInte = setInterval(function() {
        if(ws.readyState === WebSocket.OPEN) {
          const audioBlob = record.getBlob();
          console.log('Blob size: ', audioBlob.size);
          console.log('Blob type: ', audioBlob.type);

          // 发送包含音频数据的 JSON 消息
          const reader = new FileReader();
          reader.onloadend = function() {
            const arrayBuffer = reader.result;
            const uint8Array = new Uint8Array(arrayBuffer);
            const audioData = {
              clientMsgId: get().clientMsgId,
              type: 'audio',
              audioBlob: Array.from(uint8Array) // 转换为普通数组
            };
            ws.send(JSON.stringify(audioData));
            set({ audioBlob: audioBlob });
            console.log('Sending audio data');
          };
          reader.readAsArrayBuffer(audioBlob);  // 将 Blob 转换为 ArrayBuffer
        }
      }, 500);

      set({ timeInte: timeInte });
      get().setIsRecording(true);
    };

    ws.onmessage = evt => {
      console.log('Received message: ' + evt.data);
      try {
        const resJson = JSON.parse(evt.data);
        console.log('识别结果:', resJson, "get().transcriptionResult:", get().transcriptionResult);

        // 确保响应中包含 clientMsgId
        const { clientMsgId, transcriptionText, type } = resJson;
        if (clientMsgId === get().clientMsgId) {
          set(state => {
            const newText = transcriptionText || '';
            if (!newText) return state;
            return { transcriptionResult: state.transcriptionResult + ' ' + newText };
          });
        }
        if (type === 'end') {
          console.log('收到结束消息， 在录音停止后发送音频和文本');
          get().stopRecognition();
        get().sendFinalData(); 
        }
      } catch (e) {
        console.error('Failed to parse response data', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      // 不需要在这里调用 get().stopRecording()
      set({ ws: null });
    };

    ws.onerror = error => {
      console.error('WebSocket error: ' + error);
      get().stopRecording();
    };
  },

  stopRecognition: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
    }
  },

  sendFinalData: async () => {
    const { audioBlob, transcriptionResult, clientMsgId } = get();
    const websocket = get().socket;
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        console.log('WebSocket is not ready');
        return;
    }

    if (!audioBlob || !transcriptionResult) {
        console.log('No audio or transcription data to send');
        return;
    }

    // 1. 发送转录文本 via WebSocket
    const transcriptionData = {
        type: 'audio',
        content: transcriptionResult,
        clientMsgId: clientMsgId
    };
    websocket.send(JSON.stringify(transcriptionData));
    console.log('发送转录文本:', transcriptionData);
    // 打印 Blob 类型
    console.log('Audio Blob Type:', audioBlob.type);
    // 2. 上传音频文件 via HTTP POST
    const formData = new FormData();
    formData.append('file', audioBlob, `audio.pcm`);
    formData.append('fileType', audioBlob.type);

    try {
        const url = getApiServerUrl() + '/uploadfile';
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            throw new Error(`上传失败，状态码: ${response.status}`);
        }
        const responseData = await response.json();
        const audioUrl = responseData.filename; // 假设 "filename" 包含 OSS 路径
        console.log('音频上传成功:', audioUrl);
        // 3. 发送 audioUrl via WebSocket with the same clientMsgId
        const audioData = {
            type: 'audio',
            content: transcriptionResult,
            audioUrl: audioUrl,
            clientMsgId: clientMsgId
        };
        websocket.send(JSON.stringify(audioData));
        console.log('发送音频 URL:', audioData);
    } catch (error) {
        console.error('上传音频失败:', error);
        // 可选：通过 WebSocket 发送错误信息
    }

    // 清理状态
    set({ audioBlob: null, transcriptionResult: '', clientMsgId: '' });
  },

  // 如果未使用 VAD，相关代码保持不变
  // VAD
  vadEvents: null,
  isSpeaking: false,
  speakingMaxGap: 500, //in ms
  delayedSpeakingTimeoutID: null,
  vadEventsCallback: (
    voiceStartCallback,
    voiceInterimCallback,
    voiceEndCallback
  ) => {
    let vadEvents = hark(get().micStream, { interval: 20, threshold: -50 });
    vadEvents.on('speaking', () => {
      voiceStartCallback();
      if (!get().isSpeaking) {
        set({ isSpeaking: true });
      } else {
        clearTimeout(get().delayedSpeakingTimeoutID);
      }
    });
    vadEvents.on('stopped_speaking', () => {
      if (get().isSpeaking) {
        const task = setTimeout(() => {
          voiceEndCallback();
          set({ isSpeaking: false });
        }, get().speakingMaxGap);
        set({ delayedSpeakingTimeoutID: task });
        voiceInterimCallback();
      }
    });
    vadEvents.suspend();
    set({ vadEvents: vadEvents });
  },
  enableVAD: () => {
    get().vadEvents?.resume();
  },
  disableVAD: () => {
    get().vadEvents?.suspend();
  },
  closeVAD: () => {
    get().vadEvents?.stop();
    set({ vadEvents: null, isSpeaking: false });
  },
});

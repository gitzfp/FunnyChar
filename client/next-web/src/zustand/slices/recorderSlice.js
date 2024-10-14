import { getApiServerUrl } from '@/util/urlUtil';
import AudioRecorder from './AudioRecorder';
import { v4 as uuidv4 } from 'uuid'; // 导入 UUID 库
import WebAudioSpeechRecognizer from './tecentcloud-speech/app/webaudiospeechrecognizer'; // 请根据实际路径调整
import { config, signCallback } from './tecentcloud-speech/config'; // 导入腾讯云配置

export const createRecorderSlice = (set, get) => ({
  // 录音状态
  isRecording: false,
  setIsRecording: v => {
    set({ isRecording: v });
  },
  mediaRecorder: null,
  webAudioSpeechRecognizer: null, // 添加腾讯云语音识别实例
  transcriptionResult: '', // 存储识别结果文本
  audioBlob: null, // 存储音频 Blob
  clientMsgId: '',

  // 初始化麦克风（如果需要录制音频文件上传）
  connectMicrophone: () => {
    const deviceId = get().selectedMicrophone?.values().next().value;
    if (get().mediaRecorder) return;
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          deviceId: deviceId ? deviceId : undefined,
        },
      })
      .then(stream => {
        const mediaRecorder = new AudioRecorder(stream);
        set({
          mediaRecorder: mediaRecorder,
        });
      })
      .catch(function (err) {
        console.log('An error occurred: ' + err);
        if (err.name === 'NotAllowedError') {
          alert(
            '权限被拒绝：请允许访问麦克风并刷新页面重试！'
          );
        } else if (err.name === 'NotFoundError') {
          alert(
            '未找到设备：请检查您的麦克风设备并刷新页面重试。'
          );
        }
        get().stopRecording();
      });
  },

  // 开始录音和语音识别
  startRecording: () => {
    console.log('开始录音');
    // 如果需要录制音频文件上传，启动 mediaRecorder
    get().mediaRecorder?.start();

    // 创建腾讯云语音识别参数，启用 VAD 并设置静音时长
    const params = {
      signCallback: signCallback, // 您的签名回调函数
      secretid: config.secretId,
      secretkey: config.secretKey,
      appid: config.appId,
      engine_model_type: '16k_zh',
      needvad: 1, // 启用 VAD
      vad_silence_time: 1500, // 设置静音时长为 1500 毫秒
    };

    // 初始化腾讯云语音识别实例
    const webAudioSpeechRecognizer = new WebAudioSpeechRecognizer(params);

    // 设置事件处理函数
    webAudioSpeechRecognizer.OnRecognitionStart = (res) => {
      console.log('开始识别', res);
      get().setIsRecording(true);
    };
    webAudioSpeechRecognizer.OnSentenceBegin = (res) => {
      console.log('一句话开始', res);
      // 生成新的 clientMsgId
      const clientMsgId = uuidv4();
      set({ clientMsgId });

      // 清空之前的音频数据和文本
      get().mediaRecorder?.clear();
      get().transcriptionResult && set({ transcriptionResult: '' });

      // 开始录制当前句子的音频
      get().mediaRecorder?.start();
    };
    webAudioSpeechRecognizer.OnRecognitionResultChange = (res) => {
      console.log('识别结果变化', res);
      const currentText = `${get().transcriptionResult}${res.result.voice_text_str}`;
      set({ transcriptionResult: currentText });
    };
    webAudioSpeechRecognizer.OnSentenceEnd = (res) => {
      console.log('一句话结束', res);
      const resultText = res.result.voice_text_str;
      set({ transcriptionResult: resultText });

      // 停止录制，获取音频 Blob
      get().mediaRecorder?.stop();
      const audioBlob = get().mediaRecorder?.getBlob();
      set({ audioBlob });

      // 一句话识别结束，调用 sendFinalData
      get().sendFinalData();
    };
    
    webAudioSpeechRecognizer.OnRecognitionComplete = (res) => {
      console.log('识别完成', res);
      // 可在此处停止录音
      get().stopRecording();
    };
    webAudioSpeechRecognizer.OnError = (res) => {
      console.log('识别错误', res);
      get().setIsRecording(false);
      set({ webAudioSpeechRecognizer: null });
      // 如有需要，处理额外的错误逻辑
    };

    // 保存识别实例到状态中
    set({ webAudioSpeechRecognizer });

    // 开始识别
    webAudioSpeechRecognizer.start();
  },

  // 停止录音和语音识别
  stopRecording: () => {
    console.log('停止录音');
    const { webAudioSpeechRecognizer, mediaRecorder } = get();
    if (webAudioSpeechRecognizer) {
      webAudioSpeechRecognizer.stop();
      set({ webAudioSpeechRecognizer: null });
    }
    if (mediaRecorder) {
      mediaRecorder.stop();
      // 保存音频 Blob
      const audioBlob = mediaRecorder.getBlob();
      set({ audioBlob });
    }
    get().setIsRecording(false);
  },

  // 发送最终的数据（音频和转录文本）
  sendFinalData: async () => {
    const { audioBlob, transcriptionResult, clientMsgId } = get();
    const websocket = get().socket;
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      console.log('WebSocket 未就绪');
      return;
    }

    if (!transcriptionResult) {
      console.log('没有可发送的转录文本');
      return;
    }

    // 1. 通过 WebSocket 发送转录文本
    const transcriptionData = {
      type: 'audio',
      content: transcriptionResult,
      clientMsgId: clientMsgId,
    };
    websocket.send(JSON.stringify(transcriptionData));
    console.log('发送转录文本:', transcriptionData);

    // 2. 如果需要上传音频文件，执行以下步骤
    if (audioBlob) {
      const formData = new FormData();
      formData.append('file', audioBlob, `audio_${clientMsgId}.pcm`);
      formData.append('fileType', audioBlob.type);

      try {
        const url = getApiServerUrl() + '/uploadfile';
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          throw new Error(`上传失败，状态码: ${response.status}`);
        }
        const responseData = await response.json();
        const audioUrl = responseData.filename; // 假设 "filename" 包含音频文件的路径
        console.log('音频上传成功:', audioUrl);

        // 3. 通过 WebSocket 发送音频 URL
        const audioData = {
          type: 'audio',
          content: transcriptionResult,
          audioUrl: audioUrl,
          clientMsgId: clientMsgId,
        };
        websocket.send(JSON.stringify(audioData));
        console.log('发送音频 URL:', audioData);
      } catch (error) {
        console.error('上传音频失败:', error);
        // 如有需要，通过 WebSocket 发送错误信息
      }
    }

    // 清理状态
    set({ audioBlob: null, transcriptionResult: '', clientMsgId: '' });
  },
});
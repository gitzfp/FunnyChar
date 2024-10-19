import WebRecorder from "./webrecorder.js";
import { SpeechRecognizer, guid } from "./speechrecognizer.js";
import VAD from "../utils/vad.js";

export default class WebAudioSpeechRecognizer {
  constructor(params, isLog) {
    this.params = params;
    this.recorder = null;
    this.speechRecognizer = null;
    this.isCanSendData = false;
    this.isNormalEndStop = false;
    this.audioData = [];
    this.isLog = isLog;
    this.requestId = null;
    this.silentDuration = 0;
    this.sampleRate = 1600; // Set to your actual sample rate
    this.chunkDuration = 0; // Will calculate this based on data length

    this.isSpeaking = false
    this.speakTimeout = null
  }
  getCurrentAudioData = () => {
    console.log('获取音频数据')
    return this.audioData
  }
  clearCurrentAudioData = () => {
    console.log('清空音频数据')
    this.audioData = []
  }

   startUserMedia(stream) {
        // 创建 MediaStreamAudioSourceNode
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        let audioContext = new AudioContext();
        let source = audioContext.createMediaStreamSource(stream);

        // 设置选项
        let options = {
            source: source,
            voice_stop: () => {
                this.speakTimeout = setTimeout(() => {
                    this.isSpeaking = false;
                    console.log('是否在说话-结束说话：voice_stop');
                }, 3000);
            },
            voice_start: () => {
                console.log('是否在说话-开始说话：voice_start');
                if (this.speakTimeout) {
                    clearTimeout(this.speakTimeout);
                    this.speakTimeout = null;
                }
                this.isSpeaking = true;
            }
        };
        // 创建 VAD
        new VAD(options);
  }

  vadDetect() {
    navigator.getUserMedia = navigator.getUserMedia || 
                             navigator.mozGetUserMedia || 
                             navigator.webkitGetUserMedia;
    navigator.getUserMedia({audio: true}, this.startUserMedia.bind(this), function(e) {
        console.log("No live audio input in this browser: " + e);
    });
  }

 

  start() {
    try {
      this.isLog && console.log('start function is click');
      this.requestId = guid();
      this.recorder = new WebRecorder(this.requestId, this.isLog);
      this.vadDetect() 
      this.recorder.OnReceivedData = (data) => {
        if (!this.isSpeaking) {
            this.isLog && console.log("是否在说话"+self.isSpeaking, `静音检测 for ${this.silentDuration.toFixed(2)} seconds`);
            // Optionally, you can stop the recorder or speech recognizer here
            return;
        } else {
          // Reset silent duration
          this.audioData.push(data)
        } 
        if (this.isCanSendData) {
          if(this.speechRecognizer.socket.readyState !== 1)return
          // console.log(this.speechRecognizer.socket.readyState, "是否在说话"+this.isSpeaking,'非静音：',data)

          this.speechRecognizer && this.speechRecognizer.write(data);
        }
      };
      // 录音失败时
      this.recorder.OnError = (err) => {
        this.speechRecognizer && this.speechRecognizer.close();
        this.stop();
        this.OnError(err);
      }
      this.recorder.OnStop  = (res) => {
        if (this.speechRecognizer) {
          this.speechRecognizer.stop();
          // this.speechRecognizer = null;
        }
        this.OnRecorderStop(res);
      }
      this.recorder.start();
      if (!this.speechRecognizer) {
        this.speechRecognizer = new SpeechRecognizer(this.params, this.requestId, this.isLog);
      }
      // 开始识别
      this.speechRecognizer.OnRecognitionStart = (res) => {
        if (this.recorder) { // 录音正常
          this.OnRecognitionStart(res);
          this.isCanSendData = true;
        } else {
          this.speechRecognizer && this.speechRecognizer.close();
        }
      };
      // 一句话开始
      this.speechRecognizer.OnSentenceBegin = (res) => {
        this.OnSentenceBegin(res);
      };
      // 识别变化时
      this.speechRecognizer.OnRecognitionResultChange = (res) => {
        this.OnRecognitionResultChange(res);
      };
      // 一句话结束
      this.speechRecognizer.OnSentenceEnd = (res) => {
        this.OnSentenceEnd(res);
      };
      // 识别结束
      this.speechRecognizer.OnRecognitionComplete = (res) => {
        this.OnRecognitionComplete(res);
        this.isCanSendData = false;
        this.isNormalEndStop = true;
      };
      // 识别错误
      this.speechRecognizer.OnError = (res) => {
        if (this.speechRecognizer && !this.isNormalEndStop) {
          this.OnError(res);
        }
        // this.speechRecognizer = null;
        // this.recorder && this.recorder.stop();
        // this.isCanSendData = false;
      };
      // 建立连接
      this.speechRecognizer.start();
    } catch (e) {
      console.log(e);
    }
  }
  stop() {
    this.isLog && console.log('stop function is click');
    if (this.recorder) {
      this.recorder.stop();
    }
    if (this.speechRecognizer) {
      this.speechRecognizer.stop();
    }
  }
  destroyStream() {
    this.isLog && console.log('destroyStream function is click', this.recorder);
    if (this.recorder) {
      this.recorder.destroyStream();
    }
  }
  // 开始识别的时候
  OnRecognitionStart(res) {}
  // 一句话开始的时候
  OnSentenceBegin(res) {}
  // 识别结果发生变化的时候
  OnRecognitionResultChange() {}
  // 一句话结束的时候
  OnSentenceEnd() {}
  // 识别结束的时候
  OnRecognitionComplete() {}
  // 识别失败
  OnError() {}
  OnRecorderStop() {}
};

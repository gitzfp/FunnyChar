import WebRecorder from "./webrecorder.js";
import { SpeechRecognizer, guid } from "./speechrecognizer.js";

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
  }
  getCurrentAudioData() {
    return this.audioData
  }
  clearCurrentAudioData() {
    this.audioData = []
  }
   // 静音检测方法
  isSilent(data) {
    const threshold = 5; // Adjusted silence threshold for Int8Array
    const sum = data.reduce((acc, val) => acc + val * val, 0);
    const rms = Math.sqrt(sum / data.length);
    return rms < threshold;
  }

  isSilent1(data) {
        // Normalize data from Int8Array (-128 to 127) to Float32Array (-1 to 1)
        const normalizedData = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
          normalizedData[i] = data[i] / 128;
        }

        // Calculate RMS of normalized data
        const sum = normalizedData.reduce((acc, val) => acc + val * val, 0);
        const rms = Math.sqrt(sum / normalizedData.length);

        // Set a stricter threshold for normalized data
        const threshold = 0.1; // Adjust this value as needed

        return rms < threshold;
    }

  start() {
    try {
      this.isLog && console.log('start function is click');
      this.requestId = guid();
      this.recorder = new WebRecorder(this.requestId, this.isLog);
      this.recorder.OnReceivedData = (data) => {
        const isSilent = this.isSilent1(data);
          // Calculate chunk duration if not already set
        if (!this.chunkDuration) {
          this.chunkDuration = data.length / this.sampleRate; // e.g., 1280 / 16000 = 0.08 sec
        }

        if (isSilent) {
          // Increase silent duration
          this.silentDuration += this.chunkDuration;
          if (this.silentDuration >= 2) {
            // Silence has lasted more than 1.5 seconds
            this.isLog && console.log(`静音检测 for ${this.silentDuration.toFixed(2)} seconds`);
            // Optionally, you can stop the recorder or speech recognizer here
            return;
          }
        } else {
          // Reset silent duration
          this.silentDuration = 0;
          this.audioData.push(data)
          console.log('非静音：',data)
        } 
        if (this.isCanSendData) {
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
    // if (this.speechRecognizer) {
    //   this.speechRecognizer.stop();
    // }
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

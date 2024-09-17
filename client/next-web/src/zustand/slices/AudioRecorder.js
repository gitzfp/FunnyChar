// Recorder class implementation (keep same as the original)
class AudioRecorder {
  constructor(stream) {
    this.sampleBits = 16;
    this.inputSampleRate = 48000;
    this.outputSampleRate = 16000;
    this.channelCount = 1;
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.audioInput = this.context.createMediaStreamSource(stream);
    this.recorder = this.context.createScriptProcessor(4096, this.channelCount, this.channelCount);
    this.audioData = {
      size: 0,
      buffer: [],
      inputSampleRate: this.inputSampleRate,
      inputSampleBits: this.sampleBits,
      clear: function () {
        this.buffer = [];
        this.size = 0;
      },
      input: function (data) {
        this.buffer.push(new Float32Array(data));
        this.size += data.length;
      },
      encodePCM: function () {
        const bytes = new Float32Array(this.size);
        let offset = 0;
        for (let i = 0; i < this.buffer.length; i++) {
          bytes.set(this.buffer[i], offset);
          offset += this.buffer[i].length;
        }
        const dataLength = bytes.length * (this.inputSampleBits / 8);
        const buffer = new ArrayBuffer(dataLength);
        const data = new DataView(buffer);
        offset = 0;
        for (let i = 0; i < bytes.length; i++, offset += 2) {
          const s = Math.max(-1, Math.min(1, bytes[i]));
          data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return new Blob([data], { type: 'audio/pcm' });
      },
    };

    this.recorder.onaudioprocess = (e) => {
      const resampledData = this.downsampleBuffer(e.inputBuffer.getChannelData(0), this.inputSampleRate, this.outputSampleRate);
      this.audioData.input(resampledData);
    };
  }

  start() {
    this.audioInput.connect(this.recorder);
    this.recorder.connect(this.context.destination);
  }

  stop() {
    this.recorder.disconnect();
  }

  getBlob() {
    return this.audioData.encodePCM();
  }

  getOriginBlob() {
    return new Promise((resolve, reject) => {
        var audioBlob = this.getBlob();
        console.log('Blob size: ', audioBlob.size);
        console.log('Blob type: ', audioBlob.type);  // 打印 Blob 的类型

        // 创建 FileReader
        var reader = new FileReader();
        
        // 定义 onloadend 回调函数，当读取完成时触发
        reader.onloadend = function () {
            try {
                // 将 ArrayBuffer 转换为 Uint8Array
                let uint8Array = new Uint8Array(reader.result);

                // 将 Uint8Array 转换为二进制字符串
                let binary = '';
                for (let i = 0; i < uint8Array.byteLength; i++) {
                    binary += String.fromCharCode(uint8Array[i]);
                }

                // 将二进制数据转换为 base64
                const base64String = window.btoa(binary);
                console.log(base64String, "base64编码");

                // 解析 Promise 并返回 base64 编码字符串
                resolve(base64String);
            } catch (error) {
                reject(error);  // 如果出错，拒绝 Promise
            }
        };
        
        // 捕获文件读取错误
        reader.onerror = function (error) {
            reject(error);  // 如果读取时出错，拒绝 Promise
        };
        
        // 读取 Blob 为 ArrayBuffer
        reader.readAsArrayBuffer(audioBlob);
    });
}

  clear() {
    this.audioData.clear();
  }

  downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
    if (outputSampleRate === inputSampleRate) {
      return buffer;
    }
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }
}

export default AudioRecorder;
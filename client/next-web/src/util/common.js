import { WaveFile } from 'wavefile';

const clientMsgId = () => {
    return `msg-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// 定义 encodeWAV 函数
function encodeWAV(samples, sampleRate, numChannels, sampleBits) {
    const wav = new WaveFile();
    wav.fromScratch(numChannels, sampleRate, sampleBits, samples);
    return new Blob([wav.toBuffer()], { type: 'audio/wav' });
}
export {
    clientMsgId,
    encodeWAV
}
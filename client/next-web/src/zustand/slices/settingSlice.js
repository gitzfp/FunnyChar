export const createSettingSlice = (set, get) => ({
  character: {},
  preferredLanguage: new Set(['Auto Detect']),
  selectedSpeaker: new Set(['default']),
  selectedMicrophone: new Set(['default']),
  selectedModel: new Set(['gpt-4o-mini']),
  isMute: false,
  disableMic: false,
  isHandsFree: false,
  languageList: [
    'Auto Detect',
    'English',
    'Spanish',
    'French',
    'German',
    'Hindi',
    'Italian',
    'Polish',
    'Portuguese',
    'Chinese',
    'Japanese',
    'Korean',
  ],
  models: [
    {
      id: 'gpt-4o-mini',
      name: 'gpt-4o-mini',
      tooltip: 'OpenAI最强大模型',
    },
    // {
    //   id: 'qwen-max',
    //   name: 'qwen-max',
    //   tooltip: '通义千问',
    // },
  ],
  speakerList: [],
  microphoneList: [],
  recognitionResult: '',
  getAudioList: async () => {
    await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const res = await navigator.mediaDevices.enumerateDevices();
    const audioInputDevices = res.filter((device) => device.kind === 'audioinput');
    const audioOutputDevices = res.filter((device) => device.kind === 'audiooutput');
    if (audioInputDevices.length === 0) {
      console.log('No audio input devices found');
    } else {
      set({ microphoneList: audioInputDevices });
    }
    if (audioOutputDevices.length === 0) {
      console.log('No audio output devices found');
    } else {
      set({ speakerList: audioOutputDevices });
    }
  },
  setCharacter: (obj) => {
    set({ character: obj });
    // rebyte not supported for database characters yet
    if (obj.location === 'database' && get().selectedModel.has('rebyte')) {
      set({ selectedModel: new Set(['gpt-3.5-turbo-16k']) });
    }
  },
  handleLanguageChange: (e) => {
    set({ preferredLanguage: new Set([e.target.value]) });
    // to do
  },
  handleSpeakerSelect: (keys) => {
    set({ selectedSpeaker: new Set(keys) });
  },
  handleMicrophoneSelect: (keys) => {
    set({ selectedMicrophone: new Set(keys) });
  },
  handleModelChange: (e) => {
    set({ selectedModel: new Set([e.target.value]) });
  },
  setIsMute: (v) => {
    set({ isMute: v });
  },
  setDisableMic: (v) => {
    set({ disableMic: v });
  },
  setIsHandsFree: (v) => {
    set({ isHandsFree: v})
  },
  setRecognitionResult: (v) => {
    set({ recognitionResult: v})
  }
});

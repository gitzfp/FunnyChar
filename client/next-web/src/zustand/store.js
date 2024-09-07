import { create } from 'zustand';
import { createSettingSlice } from './slices/settingSlice';
import { createChatSlice } from './slices/chatSlice';
import { createWebsocketSlice } from '@/zustand/slices/websocketSlice';
import { createRecorderSlice } from '@/zustand/slices/recorderSlice';
import { createWebRTCSlice } from '@/zustand/slices/webrtcSlice';
import { createCharacterSlice } from '@/zustand/slices/characterSlice';
import { createJournalSlice } from '@/zustand/slices/journalSlice';
import { createNavigationSlice } from '@/zustand/slices/navigationSlice';
import { createUserSlice } from '@/zustand/slices/userSlice';

export const useAppStore = create((...a) => ({
  ...createSettingSlice(...a),
  ...createChatSlice(...a),
  ...createWebsocketSlice(...a),
  ...createRecorderSlice(...a),
  ...createWebRTCSlice(...a),
  ...createCharacterSlice(...a),
  ...createJournalSlice(...a),
  ...createNavigationSlice(...a),
  ...createUserSlice(...a),
}));

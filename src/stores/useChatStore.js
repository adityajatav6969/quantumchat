import { create } from 'zustand';

export const useChatStore = create((set) => ({
  status: 'idle', // idle | searching | matched | disconnected
  mode: 'video',   // video | voice | text
  roomId: null,
  peer: null,
  messages: [],
  isTyping: false,
  icebreaker: '',
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
  connectionQuality: 'good', // good | medium | poor

  setStatus: (status) => set({ status }),
  setMode: (mode) => set({ mode }),
  setRoomId: (roomId) => set({ roomId }),
  setPeer: (peer) => set({ peer }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setMessages: (messages) => set({ messages }),
  setIsTyping: (isTyping) => set({ isTyping }),
  setIcebreaker: (icebreaker) => set({ icebreaker }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),
  setScreenSharing: (val) => set({ isScreenSharing: val }),
  setConnectionQuality: (q) => set({ connectionQuality: q }),

  resetChat: () =>
    set({
      status: 'idle',
      roomId: null,
      peer: null,
      messages: [],
      isTyping: false,
      icebreaker: '',
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
    }),
}));

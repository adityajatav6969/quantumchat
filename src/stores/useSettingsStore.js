import { create } from 'zustand';

export const useSettingsStore = create((set) => ({
  theme: 'dark',
  cameraDeviceId: '',
  micDeviceId: '',
  notifications: true,
  soundEffects: true,
  autoTranslate: false,
  noiseSupression: true,
  echoCancellation: true,

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),
  setCameraDeviceId: (id) => set({ cameraDeviceId: id }),
  setMicDeviceId: (id) => set({ micDeviceId: id }),
  toggleNotifications: () => set((s) => ({ notifications: !s.notifications })),
  toggleSoundEffects: () => set((s) => ({ soundEffects: !s.soundEffects })),
  toggleAutoTranslate: () => set((s) => ({ autoTranslate: !s.autoTranslate })),
  toggleNoiseSuppression: () => set((s) => ({ noiseSupression: !s.noiseSupression })),
  toggleEchoCancellation: () => set((s) => ({ echoCancellation: !s.echoCancellation })),
}));

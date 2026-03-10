import { create } from 'zustand';

export const useUserStore = create((set) => ({
  nickname: '',
  avatar: '',
  interests: [],
  category: 'random',
  bio: '',
  userId: null,
  sessionActive: false,

  setNickname: (nickname) => set({ nickname }),
  setAvatar: (avatar) => set({ avatar }),
  setInterests: (interests) => set({ interests }),
  toggleInterest: (interest) =>
    set((state) => ({
      interests: state.interests.includes(interest)
        ? state.interests.filter((i) => i !== interest)
        : [...state.interests, interest],
    })),
  setCategory: (category) => set({ category }),
  setBio: (bio) => set({ bio }),
  setUserId: (userId) => set({ userId }),
  setSessionActive: (active) => set({ sessionActive: active }),
  reset: () =>
    set({
      nickname: '',
      avatar: '',
      interests: [],
      category: 'random',
      bio: '',
      userId: null,
      sessionActive: false,
    }),
}));

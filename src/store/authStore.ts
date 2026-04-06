import { create } from 'zustand';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

interface AuthState {
  user: User | null;
  userData: any | null;
  role: 'creator' | 'customer' | null;
  loading: boolean;
  initialized: boolean;
  init: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userData: null,
  role: null,
  loading: true,
  initialized: false,
  init: () => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            set({ user, userData: data, role: data.role, loading: false, initialized: true });
          } else {
            set({ user, userData: null, role: null, loading: false, initialized: true });
          }
        }, (error) => {
          console.error("Error fetching user data:", error);
          set({ user, userData: null, role: null, loading: false, initialized: true });
        });

        // Store unsubscribe function if needed, but for now it's fine
      } else {
        set({ user: null, userData: null, role: null, loading: false, initialized: true });
      }
    });
  },
  logout: async () => {
    await signOut(auth);
    set({ user: null, userData: null, role: null });
  }
}));

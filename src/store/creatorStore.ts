import { create } from 'zustand';

interface PayoutRequest {
  id: string;
  amount: number;
  status: 'В обработке' | 'Выплачено' | 'Отклонено';
  date: string;
}

interface CreatorState {
  requestPayout: (amount: number, currentBalance: number) => boolean;
}

export const useCreatorStore = create<CreatorState>(() => ({
  requestPayout: (amount, currentBalance) => {
    if (amount > currentBalance || amount <= 0) return false;
    return true;
  }
}));

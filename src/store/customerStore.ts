import { create } from 'zustand';

interface Transaction {
  id: string;
  type: 'deposit' | 'payout';
  amount: number;
  currency?: string;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  details: string;
}

interface CustomerState {
  transactions: Transaction[];
  requestDeposit: (amount: number, currency: string) => boolean;
}

export const useCustomerStore = create<CustomerState>((set) => ({
  transactions: [],
  requestDeposit: (amount, currency) => {
    if (amount <= 0) return false;

    set((state) => ({
      transactions: [
        {
          id: `TX-${Math.floor(Math.random() * 10000)}`,
          type: 'deposit',
          amount,
          currency,
          status: 'pending',
          date: new Date().toLocaleDateString('ru-RU'),
          details: `Ожидание оплаты (${currency})`
        },
        ...state.transactions
      ]
    }));
    return true;
  }
}));

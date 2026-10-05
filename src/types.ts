export const EXPENSE_CATEGORIES = ['Food', 'Transport', 'School', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Other'] as const;
export const INCOME_CATEGORIES = ['Allowance', 'Salary', 'Gift', 'Other'] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
export type IncomeCategory = typeof INCOME_CATEGORIES[number];
export type Category = ExpenseCategory | IncomeCategory;
export type TransactionType = 'income' | 'expense';

export type Transaction = {
  id: string;
  amountCents: number;
  type: TransactionType;
  description: string;
  category: Category;
  walletId: string;
  transactionDate: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Wallet = {
  id: string;
  name: string;
  openingBalanceCents: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Transfer = {
  id: string;
  fromWalletId: string;
  toWalletId: string;
  amountCents: number;
  description: string;
  transferDate: string;
  createdAt?: string;
};

export type Budget = {
  id: string;
  month: string;
  overallCents: number;
  categories: Partial<Record<ExpenseCategory, number>>;
  updatedAt?: string;
};

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;
export type WalletInput = Pick<Wallet, 'name' | 'openingBalanceCents'>;
export type TransferInput = Omit<Transfer, 'id' | 'createdAt'>;

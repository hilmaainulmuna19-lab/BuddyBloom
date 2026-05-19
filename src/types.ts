export interface UserProfile {
  uid: string;
  displayName: string;
  level: number;
  exp: number;
  characterId: string;
  waterReminder: boolean;
  mealReminder: boolean;
  dailyQuote: string;
  quoteType?: 'ai' | 'custom';
  customQuote?: string;
  theme: string;
  updatedAt: string;
}

export interface Journal {
  id?: string;
  userId: string;
  content: string;
  mood: 'happy' | 'sad' | 'flat' | 'angry' | 'love';
  song?: string;
  aiReflection?: string;
  aiAffirmation?: string;
  date: string;
  createdAt: string;
}

export interface Habit {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  icon: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  frequency: 'daily' | 'weekly' | 'monthly';
  streak: number;
  lastCompleted?: string;
  createdAt: string;
}

export interface HabitLog {
  id?: string;
  habitId: string;
  userId: string;
  date: string;
  completed: boolean;
  timestamp: string;
}

export interface Transaction {
  id?: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
  date: string;
  createdAt: string;
}

export interface FinancialGoal {
  id?: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  createdAt: string;
}

export interface Task {
  id?: string;
  userId: string;
  title: string;
  category: 'Work' | 'Personal' | 'Errands';
  completed: boolean;
  date: string;
  createdAt: string;
}

export interface Reward {
  id?: string;
  userId: string;
  name: string;
  cost: number;
  isClaimed: boolean;
  claimedAt: string;
}

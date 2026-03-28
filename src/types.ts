export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category?: string;
  deadline?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: number;
  currency: string;
  monthlyIncome?: number;
  essentialExpenses?: number;
  customInflationRate?: number;
  budgets?: { [category: string]: number };
  goals?: Goal[];
  streak?: number;
  badges?: string[];
}

export interface Expense {
  id: string;
  uid: string;
  amount: number;
  category: string;
  description: string;
  date: number;
  tags?: string[];
  aiAnalysis?: AIAnalysis;
}

export interface AIAnalysis {
  inflationTimeMachine: {
    cost2016: number;
    cost2036: number;
    explanation: string;
  };
  macroMicroConnection: {
    factor: string;
    description: string;
  };
  resilienceStressTest: {
    score: number;
    survivalImpact: string;
  };
  economicIndicators: {
    label: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    impact: string;
  }[];
  smartMoveAdvice: {
    tip: string;
    strategy: string;
    inflationHedge: string;
  };
}

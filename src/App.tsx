/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  setDoc,
  getDoc
} from 'firebase/firestore';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Zap, 
  Clock, 
  Globe, 
  Plus, 
  LogOut, 
  Wallet,
  BarChart3,
  History,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  MessageSquare,
  Send,
  Settings,
  User as UserIcon,
  DollarSign,
  Percent,
  Tag,
  Filter,
  ArrowUpDown,
  Calendar,
  PieChart,
  Target,
  Bell,
  ExternalLink
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart as RePieChart,
  Pie,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { auth, db, signInWithGoogle, logout } from './lib/firebase';
import { analyzeExpense, getFinancialAdvice } from './lib/gemini';
import { Expense, UserProfile, AIAnalysis, Goal } from './types';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORY_COLORS: { [key: string]: string } = {
  Groceries: '#0ea5e9',
  Utilities: '#6366f1',
  Entertainment: '#8b5cf6',
  Travel: '#ec4899',
  Healthcare: '#f43f5e',
  Transport: '#f59e0b',
  Shopping: '#10b981',
  Other: '#64748b'
};

const SHIELD_LEVELS = [
  { min: 0, max: 20, label: 'Critical', color: 'text-red-600', bg: 'bg-red-50', desc: 'Your economy is highly vulnerable to shocks.' },
  { min: 21, max: 40, label: 'Vulnerable', color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Basic needs are covered, but inflation is winning.' },
  { min: 41, max: 60, label: 'Stable', color: 'text-amber-600', bg: 'bg-amber-50', desc: 'You have a solid foundation, but growth is slow.' },
  { min: 61, max: 80, label: 'Resilient', color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'You are actively hedging against economic shifts.' },
  { min: 81, max: 100, label: 'Anti-fragile', color: 'text-brand-600', bg: 'bg-brand-50', desc: 'Economic chaos actually makes you stronger.' },
];

const getShieldLevel = (score: number) => {
  return SHIELD_LEVELS.find(l => score >= l.min && score <= l.max) || SHIELD_LEVELS[0];
};

const MOCK_GOALS: Goal[] = [
  { id: 'g0', title: 'Financial Freedom', targetAmount: 100000, currentAmount: 15000, category: 'Other' },
  { id: 'g1', title: 'Emergency Fund', targetAmount: 5000, currentAmount: 3200, category: 'Other' },
  { id: 'g2', title: 'New Laptop', targetAmount: 1500, currentAmount: 450, category: 'Shopping' },
  { id: 'g3', title: 'Vacation Fund', targetAmount: 2000, currentAmount: 1200, category: 'Travel' }
];

const MOCK_EXPENSES: Expense[] = [
  {
    id: 'mock-1',
    uid: 'demo',
    amount: 120,
    category: 'Groceries',
    description: 'Weekly organic supplies',
    date: Date.now() - 86400000 * 1,
    tags: ['essential', 'organic'],
    aiAnalysis: {
      inflationTimeMachine: { cost2016: 85, cost2036: 280, explanation: "Food inflation outpaces baseline CPI." },
      resilienceStressTest: { score: 75, survivalImpact: "High quality nutrition builds long-term human capital." },
      economicIndicators: [{ label: "Food CPI", value: "+4.2%", trend: "up", impact: "Reduces discretionary income." }],
      macroMicroConnection: { factor: "Agricultural Yields", description: "Climate shifts affect local prices." },
      smartMoveAdvice: { tip: "Buy non-perishables in bulk", strategy: "Lock in today's prices.", inflationHedge: "Essentials are a 0% risk hedge." }
    }
  },
  {
    id: 'mock-2',
    uid: 'demo',
    amount: 450,
    category: 'Travel',
    description: 'Flight to Tech Conf',
    date: Date.now() - 86400000 * 3,
    tags: ['work', 'networking'],
    aiAnalysis: {
      inflationTimeMachine: { cost2016: 320, cost2036: 980, explanation: "Jet fuel is a structural inflation driver." },
      resilienceStressTest: { score: 45, survivalImpact: "High-cost travel requires revenue offset." },
      economicIndicators: [{ label: "Jet Fuel Spot", value: "$2.8/gal", trend: "up", impact: "Costs passed to consumers." }],
      macroMicroConnection: { factor: "Oil Prices", description: "Geopolitical tension spikes transit costs." },
      smartMoveAdvice: { tip: "Book 6 weeks out", strategy: "Use dynamic pricing algorithms.", inflationHedge: "Travel points are depreciating; use them." }
    }
  },
  {
    id: 'mock-3',
    uid: 'demo',
    amount: 85,
    category: 'Entertainment',
    description: 'Streaming & Gaming',
    date: Date.now() - 86400000 * 5,
    tags: ['leisure'],
    aiAnalysis: {
      inflationTimeMachine: { cost2016: 45, cost2036: 180, explanation: "Digital services see steady subscription creep." },
      resilienceStressTest: { score: 90, survivalImpact: "Low cost entertainment preserves mental health." },
      economicIndicators: [{ label: "Service CPI", value: "+3.1%", trend: "up", impact: "Slow erosion of purchasing power." }],
      macroMicroConnection: { factor: "Cloud Costs", description: "Server energy costs drive subscription hikes." },
      smartMoveAdvice: { tip: "Annual billing", strategy: "Lock in rates for 12 months.", inflationHedge: "Prepaid services hedge against mid-year hikes." }
    }
  },
  {
    id: 'mock-4',
    uid: 'demo',
    amount: 210,
    category: 'Utilities',
    description: 'Monthly Energy Bill',
    date: Date.now() - 86400000 * 10,
    tags: ['essential'],
    aiAnalysis: {
      inflationTimeMachine: { cost2016: 140, cost2036: 520, explanation: "Energy transition costs drive utility inflation." },
      resilienceStressTest: { score: 60, survivalImpact: "Essential cost with low elasticity." },
      economicIndicators: [{ label: "Nat Gas Index", value: "+12%", trend: "up", impact: "Heating costs rising." }],
      macroMicroConnection: { factor: "Grid Modernization", description: "Infrastructure upgrades passed to rate-payers." },
      smartMoveAdvice: { tip: "Smart thermostat", strategy: "Reduce consumption by 15% via automation.", inflationHedge: "Efficiency is the ultimate hedge." }
    }
  }
];

// --- Components ---

const Logo = ({ isDemo }: { isDemo?: boolean }) => (
  <div className="flex items-center gap-3 group cursor-pointer">
    <div className="relative">
      <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-2xl shadow-slate-200 group-hover:scale-110 transition-transform overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-transparent" />
        <Zap className="w-7 h-7 text-brand-400 relative z-10" />
        <motion.div 
          animate={{ x: [-20, 40], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
        />
      </div>
      <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      </div>
    </div>
    <div className="flex flex-col -space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="font-black text-3xl tracking-tighter text-slate-900 uppercase">Arth-AI</span>
        {isDemo && (
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest">Demo</span>
        )}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-brand-600/80">Economic Engine v2.0</span>
    </div>
  </div>
);

const StreakCounter = ({ streak = 0 }: { streak?: number }) => (
  <div className="stat-card flex flex-col justify-between overflow-hidden relative group">
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors" />
    <div className="flex items-center justify-between relative z-10">
      <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
        <Zap className="w-5 h-5" />
      </div>
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={cn("w-1 h-3 rounded-full", i < streak ? "bg-orange-500" : "bg-slate-200")} />
        ))}
      </div>
    </div>
    <div className="relative z-10">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Economic Streak</p>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-black text-slate-900">{streak}</p>
        <p className="text-[10px] font-bold text-orange-600">Days Active</p>
      </div>
    </div>
  </div>
);

const BadgeGallery = ({ badges = [] }: { badges?: string[] }) => {
  const allBadges = [
    { id: 'saver', icon: Wallet, label: 'Super Saver', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'analyst', icon: BarChart3, label: 'Economic Analyst', color: 'text-brand-500', bg: 'bg-brand-50' },
    { id: 'hedger', icon: Shield, label: 'Inflation Hedger', color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'minimalist', icon: Zap, label: 'Minimalist', color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="font-bold text-slate-900 flex items-center gap-2">
        <Zap className="w-5 h-5 text-brand-500" />
        Economic Achievements
      </h3>
      <div className="grid grid-cols-4 gap-3">
        {allBadges.map((b) => {
          const isUnlocked = badges.includes(b.id);
          return (
            <div 
              key={b.id} 
              className={cn(
                "aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all",
                isUnlocked ? b.bg : "bg-slate-50 grayscale opacity-40"
              )}
              title={b.label}
            >
              <b.icon className={cn("w-6 h-6", isUnlocked ? b.color : "text-slate-400")} />
              <span className="text-[8px] font-black uppercase tracking-tighter text-center px-1">{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CommunityBenchmarks = ({ income }: { income?: number }) => {
  const benchmarks = [
    { label: "Shopping", avg: 12, desc: "Users in your bracket keep shopping under 12%." },
    { label: "Groceries", avg: 15, desc: "Efficient households spend ~15% on quality food." },
    { label: "Savings", avg: 20, desc: "Top 10% of users save at least 20% of monthly income." }
  ];

  return (
    <div className="glass-card p-6 bg-slate-900 text-white border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-brand-400" />
          Community Benchmarks
        </h3>
      </div>
      <div className="space-y-4">
        {benchmarks.map((b, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
              <span>{b.label} Target</span>
              <span className="text-brand-400">{b.avg}%</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{b.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const GoalsCard = ({ goals, onAddGoal, onAddTemplate }: { goals: Goal[], onAddGoal: () => void, onAddTemplate: (title: string, target: number) => void }) => {
  const templates = [
    { title: 'Emergency Fund', target: 5000, icon: <Shield className="w-3 h-3" /> },
    { title: 'Debt Free', target: 2000, icon: <Zap className="w-3 h-3" /> },
    { title: 'Investment Seed', target: 1000, icon: <TrendingUp className="w-3 h-3" /> },
  ];

  return (
    <div className="glass-card p-6 space-y-6 relative overflow-hidden" id="tour-goals">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-brand-500" />
          Financial Goals
        </h3>
        <button 
          onClick={onAddGoal}
          className="p-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-6">
        {goals.map((goal, idx) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          const isNorthStar = idx === 0;
          return (
            <div key={goal.id} className={cn("space-y-2 p-3 rounded-2xl transition-all", isNorthStar && "bg-brand-50/50 border border-brand-100 shadow-sm")}>
              <div className="flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900">{goal.title}</p>
                    {isNorthStar && <span className="text-[8px] font-black uppercase tracking-widest text-brand-600 bg-brand-100 px-1 rounded">North Star</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Target: ${goal.targetAmount}</p>
                </div>
                <p className="text-xs font-black text-brand-600">{Math.round(progress)}%</p>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className={cn("h-full rounded-full", isNorthStar ? "bg-brand-500" : "bg-slate-400")}
                />
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-400 text-center">No goals set yet. Start with a template:</p>
            <div className="grid grid-cols-1 gap-2">
              {templates.map((t) => (
                <button
                  key={t.title}
                  onClick={() => onAddTemplate(t.title, t.target)}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand-300 hover:bg-brand-50 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white text-slate-400 group-hover:text-brand-500 shadow-sm">
                      {t.icon}
                    </div>
                    <span className="text-xs font-bold text-slate-600 group-hover:text-brand-700">{t.title}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-brand-500">${t.target}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileModal = ({ 
  isOpen, 
  onClose, 
  profile, 
  onUpdate 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  profile: UserProfile | null,
  onUpdate: (data: Partial<UserProfile>) => Promise<void>
}) => {
  const [income, setIncome] = useState(profile?.monthlyIncome?.toString() || '');
  const [essentials, setEssentials] = useState(profile?.essentialExpenses?.toString() || '');
  const [inflation, setInflation] = useState(profile?.customInflationRate?.toString() || '');
  const [budgets, setBudgets] = useState<{ [category: string]: string }>(
    Object.fromEntries(Object.entries(profile?.budgets || {}).map(([k, v]) => [k, v.toString()]))
  );
  const [saving, setSaving] = useState(false);

  const categories = ['Groceries', 'Utilities', 'Entertainment', 'Travel', 'Healthcare', 'Transport', 'Shopping', 'Other'];

  useEffect(() => {
    if (profile) {
      setIncome(profile.monthlyIncome?.toString() || '');
      setEssentials(profile.essentialExpenses?.toString() || '');
      setInflation(profile.customInflationRate?.toString() || '');
      setBudgets(Object.fromEntries(Object.entries(profile.budgets || {}).map(([k, v]) => [k, v.toString()])));
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onUpdate({
      monthlyIncome: income ? Number(income) : undefined,
      essentialExpenses: essentials ? Number(essentials) : undefined,
      customInflationRate: inflation ? Number(inflation) : undefined,
      budgets: Object.fromEntries(
        Object.entries(budgets)
          .filter(([_, v]) => v !== '')
          .map(([k, v]) => [k, Number(v)])
      )
    });
    setSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="text-xl font-bold text-slate-900">Financial Profile & Budgets</h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Monthly Income ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      placeholder="5000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Essential Expenses ($)</label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      value={essentials}
                      onChange={(e) => setEssentials(e.target.value)}
                      placeholder="2000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Inflation Rate (%)</label>
                  <div className="relative">
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      step="0.1"
                      value={inflation}
                      onChange={(e) => setInflation(e.target.value)}
                      placeholder="6.5"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-500" />
                  <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Monthly Category Budgets</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categories.map(cat => (
                    <div key={cat} className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 ml-1">{cat}</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <input
                          type="number"
                          value={budgets[cat] || ''}
                          onChange={(e) => setBudgets(prev => ({ ...prev, [cat]: e.target.value }))}
                          placeholder="Set limit"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-brand-600 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                  Save Financial Profile & Budgets
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const BudgetAlert = ({ 
  expenses, 
  budgets 
}: { 
  expenses: Expense[], 
  budgets: { [category: string]: number } 
}) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const alerts = Object.entries(budgets).map(([category, limit]) => {
    const spent = monthlyExpenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
    const percent = (spent / limit) * 100;
    
    if (percent >= 80) {
      return { category, spent, limit, percent };
    }
    return null;
  }).filter(Boolean);

  if (alerts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {alerts.map((alert: any) => (
        <motion.div
          key={alert.category}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-3 rounded-2xl border flex items-center gap-3 shadow-sm",
            alert.percent >= 100 
              ? "bg-red-50 border-red-100 text-red-700" 
              : "bg-amber-50 border-amber-100 text-amber-700"
          )}
        >
          <div className={cn(
            "p-2 rounded-xl shrink-0",
            alert.percent >= 100 ? "bg-red-100" : "bg-amber-100"
          )}>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">
              {alert.percent >= 100 ? 'Budget Exceeded' : 'Budget Warning'}
            </p>
            <p className="text-[10px] opacity-80 truncate">
              {alert.category}: ${alert.spent.toFixed(0)} / ${alert.limit}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-black">{alert.percent.toFixed(0)}%</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const BudgetProgress = ({ 
  expenses, 
  budgets 
}: { 
  expenses: Expense[], 
  budgets: { [category: string]: number } 
}) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-brand-500" />
          Budget Progress
        </h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Month</span>
      </div>
      <div className="space-y-4">
        {Object.entries(budgets).map(([category, limit]) => {
          const spent = monthlyExpenses
            .filter(e => e.category === category)
            .reduce((sum, e) => sum + e.amount, 0);
          const percent = Math.min((spent / limit) * 100, 100);
          const color = percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-amber-500' : 'bg-brand-500';
          
          return (
            <div key={category} className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">{category}</span>
                <span className="text-slate-900">${spent.toFixed(0)} / ${limit}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  className={cn("h-full rounded-full transition-all", color)}
                />
              </div>
            </div>
          );
        })}
        {Object.keys(budgets).length === 0 && (
          <p className="text-center text-slate-400 text-sm py-4">No budgets set. Go to Profile to set limits.</p>
        )}
      </div>
    </div>
  );
};

const HealthGauge = ({ score }: { score: number }) => {
  const level = getShieldLevel(score);
  const color = score > 70 ? '#10b981' : score > 40 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="10"
          />
          <motion.circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray="264"
            initial={{ strokeDashoffset: 264 }}
            animate={{ strokeDashoffset: 264 - (score / 100) * 264 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-slate-900">{score}</span>
          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Shield</span>
        </div>
      </div>
      <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", level.bg, level.color)}>
        {level.label}
      </span>
    </div>
  );
};

const TransactionHistory = ({ 
  expenses, 
  onSelect 
}: { 
  expenses: Expense[], 
  onSelect: (e: Expense) => void 
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof Expense, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const categories = ['All', 'Groceries', 'Utilities', 'Entertainment', 'Travel', 'Healthcare', 'Transport', 'Shopping', 'Other'];

  const sortedExpenses = useMemo(() => {
    let items = [...expenses];
    
    if (filter) {
      items = items.filter(e => 
        e.description.toLowerCase().includes(filter.toLowerCase()) ||
        e.category.toLowerCase().includes(filter.toLowerCase()) ||
        e.tags?.some(t => t.toLowerCase().includes(filter.toLowerCase()))
      );
    }

    if (categoryFilter !== 'All') {
      items = items.filter(e => e.category === categoryFilter);
    }

    if (minAmount) {
      items = items.filter(e => e.amount >= Number(minAmount));
    }

    if (maxAmount) {
      items = items.filter(e => e.amount <= Number(maxAmount));
    }

    items.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [expenses, sortConfig, filter, categoryFilter]);

  const requestSort = (key: keyof Expense) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const downloadCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Tags'];
    const rows = sortedExpenses.map(e => [
      format(e.date, 'yyyy-MM-dd'),
      e.description,
      e.category,
      e.amount,
      e.tags?.join('; ') || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `arth_ai_ledger_${format(new Date(), 'yyyy_MM_dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search transactions..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Min $</span>
              <input 
                type="number" 
                value={minAmount} 
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-16 text-sm font-bold outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Max $</span>
              <input 
                type="number" 
                value={maxAmount} 
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-16 text-sm font-bold outline-none"
              />
            </div>
            <button
              onClick={downloadCSV}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              title="Download CSV"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 w-full overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                categoryFilter === cat 
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-200" 
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
          {(filter || categoryFilter !== 'All' || minAmount || maxAmount) && (
            <button
              onClick={() => {
                setFilter('');
                setCategoryFilter('All');
                setMinAmount('');
                setMaxAmount('');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap text-red-500 hover:bg-red-50 transition-all"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th 
                  onClick={() => requestSort('date')}
                  className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Date <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</th>
                <th 
                  onClick={() => requestSort('category')}
                  className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Category <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => requestSort('amount')}
                  className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-brand-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Amount <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedExpenses.map((expense) => (
                <tr 
                  key={expense.id} 
                  onClick={() => onSelect(expense)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                    {format(expense.date, 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{expense.description || 'No description'}</span>
                      {expense.tags && expense.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {expense.tags.map(tag => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold uppercase">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">
                    -${expense.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(expense);
                      }}
                      className="p-2 rounded-lg hover:bg-brand-50 text-slate-400 hover:text-brand-500 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedExpenses.length === 0 && (
          <div className="py-20 text-center">
            <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No matching transactions found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const QuickTips = () => (
  <div className="glass-card p-6 space-y-4">
    <h3 className="font-bold text-slate-900 flex items-center gap-2">
      <Zap className="w-5 h-5 text-brand-500" />
      Quick Economic Tips
    </h3>
    <div className="space-y-3">
      {[
        { title: "Hedge with Assets", desc: "Consider diversifying into inflation-resistant assets like commodities or real estate." },
        { title: "Monitor Velocity", desc: "High spending velocity in non-essentials can erode your long-term resilience." },
        { title: "Debt Strategy", desc: "In high inflation, fixed-rate debt becomes cheaper over time. Avoid variable rates." }
      ].map((tip, i) => (
        <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-xs font-bold text-slate-900">{tip.title}</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">{tip.desc}</p>
        </div>
      ))}
    </div>
  </div>
);

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    >
      <Zap className="w-12 h-12 text-brand-500" />
    </motion.div>
    <p className="mt-4 text-slate-600 font-medium animate-pulse">Initializing Arth-AI Intelligence...</p>
  </div>
);

const AuthScreen = ({ onSignIn, onDemoMode, error }: { onSignIn: () => void, onDemoMode: () => void, error: string | null }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
    {/* Animated Background Elements */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
          opacity: [0.03, 0.05, 0.03]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-1/4 -left-1/4 w-full h-full bg-brand-500 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, -60, 0],
          opacity: [0.02, 0.04, 0.02]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-indigo-500 rounded-full blur-[120px]"
      />
      <div className="absolute inset-0 brand-grid opacity-[0.4]" />
    </div>

    <div className="max-w-md w-full text-center space-y-8 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="relative inline-block group">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-brand-400 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
          />
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-slate-900 text-white shadow-2xl group-hover:scale-105 transition-transform">
            <Zap className="w-12 h-12 text-brand-400" />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">Arth-AI</h1>
          <div className="flex items-center justify-center gap-2">
            <div className="h-[1px] w-8 bg-slate-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-600">Economic Engine</span>
            <div className="h-[1px] w-8 bg-slate-200" />
          </div>
        </div>

        <p className="text-slate-500 text-lg leading-relaxed px-4">
          Decode the hidden impact of the global economy on your daily life.
        </p>

        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Intelligence by Gemini 3.0
          </span>
        </div>
      </motion.div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm text-left space-y-2">
          <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
            <AlertCircle className="w-4 h-4" />
            Authentication Error
          </div>
          <p>{error}</p>
          {error.includes('unauthorized-domain') && (
            <p className="text-xs opacity-80">
              Note: This domain is not authorized in your Firebase project. Please add your deployment domain to the Authorized Domains list in the Firebase Console.
            </p>
          )}
        </div>
      )}
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <button
          onClick={onSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-bold py-4.5 px-6 rounded-3xl shadow-xl shadow-slate-200/50 hover:bg-slate-50 hover:-translate-y-0.5 transition-all active:scale-[0.98] group"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          Continue with Google
        </button>

        <button
          onClick={onDemoMode}
          className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white font-bold py-4.5 px-6 rounded-3xl shadow-xl shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all active:scale-[0.98] group"
        >
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap className="w-5 h-5 text-brand-400" />
          </motion.div>
          Explore in Demo Mode
        </button>
      </motion.div>
      
      <div className="grid grid-cols-3 gap-4 pt-8">
        {[
          { icon: Clock, label: "Inflation Tracking" },
          { icon: Globe, label: "Macro Insights" },
          { icon: Shield, label: "Survival Score" }
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="p-3 rounded-xl bg-brand-50 text-brand-600">
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AnalysisCard = ({ analysis }: { analysis: AIAnalysis }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inflation Time Machine */}
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 space-y-3">
          <div className="flex items-center gap-2 text-amber-700">
            <Clock className="w-5 h-5" />
            <h3 className="font-bold uppercase text-xs tracking-widest">Inflation Time Machine</h3>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-amber-600 font-bold uppercase">2016 Cost</p>
              <p className="text-xl font-mono font-bold text-amber-900">${analysis.inflationTimeMachine.cost2016.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-amber-600 font-bold uppercase">2036 Projection</p>
              <p className="text-xl font-mono font-bold text-amber-900">${analysis.inflationTimeMachine.cost2036.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-sm text-amber-800/80 leading-relaxed italic">"{analysis.inflationTimeMachine.explanation}"</p>
        </div>

        {/* Resilience Stress Test */}
        <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-3">
          <div className="flex items-center gap-2 text-indigo-700">
            <Shield className="w-5 h-5" />
            <h3 className="font-bold uppercase text-xs tracking-widest">Resilience Stress Test</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-200 flex items-center justify-center bg-white shadow-inner">
              <span className="text-2xl font-bold text-indigo-700">{analysis.resilienceStressTest.score}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-indigo-900">Financial Shield Score</p>
              <p className="text-xs text-indigo-700/70">{analysis.resilienceStressTest.survivalImpact}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Economic Indicators */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Live Economic Indicators</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {analysis.economicIndicators.map((indicator, i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">{indicator.label}</p>
                <p className="text-[10px] text-slate-500 font-medium">{indicator.impact}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-bold text-slate-900">{indicator.value}</p>
                <div className="flex items-center justify-end gap-1">
                  {indicator.trend === 'up' && <TrendingUp className="w-3 h-3 text-red-500" />}
                  {indicator.trend === 'down' && <TrendingDown className="w-3 h-3 text-emerald-500" />}
                  <span className={cn(
                    "text-[9px] font-bold uppercase",
                    indicator.trend === 'up' ? "text-red-500" : indicator.trend === 'down' ? "text-emerald-500" : "text-slate-400"
                  )}>
                    {indicator.trend}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Macro-Micro Connection */}
      <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-2">
        <div className="flex items-center gap-2 text-emerald-700">
          <Globe className="w-5 h-5" />
          <h3 className="font-bold uppercase text-xs tracking-widest">Macro-Micro Connection</h3>
        </div>
        <p className="text-sm font-bold text-emerald-900">{analysis.macroMicroConnection.factor}</p>
        <p className="text-sm text-emerald-800/80 leading-relaxed">{analysis.macroMicroConnection.description}</p>
      </div>

      {/* Smart Move Advice */}
      <div className="p-6 rounded-[2rem] bg-brand-500 text-white shadow-xl shadow-brand-100 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Zap className="w-24 h-24" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-bold uppercase text-xs tracking-widest">Smart Move Advice</h3>
          </div>
          <p className="text-lg font-bold leading-tight mb-2">{analysis.smartMoveAdvice.tip}</p>
          <p className="text-sm text-white/80 leading-relaxed mb-4">{analysis.smartMoveAdvice.strategy}</p>
          <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">Inflation Hedge Strategy</p>
            <p className="text-sm font-medium">{analysis.smartMoveAdvice.inflationHedge}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatInterface = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: "Hello! I'm your Arth-AI mentor. Ask me anything about the economy or your personal finances." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await getFinancialAdvice(userMsg, messages);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I'm having trouble connecting to the economic grid. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="relative w-full max-w-lg bg-white sm:rounded-3xl shadow-2xl overflow-hidden h-[80vh] sm:h-[600px] flex flex-col"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-brand-500 text-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <h3 className="font-bold">Arth-AI Mentor</h3>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm",
                    msg.role === 'user' 
                      ? "bg-brand-500 text-white rounded-tr-none" 
                      : "bg-slate-100 text-slate-700 rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about inflation, stocks, or savings..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
              <button 
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const EconomicSimulator = ({ 
  currentScore, 
  currentInflation 
}: { 
  currentScore: number, 
  currentInflation: number 
}) => {
  const [cutPercent, setCutPercent] = useState(10);
  const [futureInflation, setFutureInflation] = useState(currentInflation || 6.5);

  const projectedScore = Math.min(100, Math.round(currentScore * (1 + cutPercent / 100)));
  const costMultiplier = Math.pow(1 + futureInflation / 100, 10);

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-brand-500" />
          Economic "What-If" Simulator
        </h3>
      </div>
      
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
            <span>Cut Non-Essentials</span>
            <span className="text-brand-600">{cutPercent}%</span>
          </div>
          <input 
            type="range" min="0" max="50" value={cutPercent} 
            onChange={(e) => setCutPercent(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
            <span>Future Inflation Rate</span>
            <span className="text-brand-600">{futureInflation}%</span>
          </div>
          <input 
            type="range" min="2" max="20" step="0.5" value={futureInflation} 
            onChange={(e) => setFutureInflation(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-3 rounded-2xl bg-brand-50 border border-brand-100">
            <p className="text-[8px] font-bold uppercase text-brand-600 mb-1">Projected Shield</p>
            <p className="text-xl font-black text-brand-900">{projectedScore}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[8px] font-bold uppercase text-slate-400 mb-1">10Y Cost Multiplier</p>
            <p className="text-xl font-black text-slate-900">{costMultiplier.toFixed(1)}x</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ArthLab = ({ lastExpense }: { lastExpense?: Expense }) => {
  const [activeTip, setActiveTip] = useState(0);
  
  const genericTips = [
    { title: "CPI vs Personal Inflation", desc: "CPI measures a basket of goods, but your personal inflation depends on your specific spending mix." },
    { title: "The Rule of 72", desc: "Divide 72 by the inflation rate to see how many years it takes for your money's value to halve." },
    { title: "Hedging Essentials", desc: "Buying non-perishables in bulk during low-inflation periods is a simple way to hedge your future costs." }
  ];

  const categoryTips: { [key: string]: string } = {
    Groceries: "Food prices are highly sensitive to energy costs and seasonal yields. Bulk buying can save 15% annually.",
    Travel: "Currency depreciation affects international fares. Booking in your home currency can sometimes hedge against FX shifts.",
    Utilities: "Energy inflation is often structural. Investing in efficiency is the best long-term economic shield.",
    Shopping: "Consumer goods often follow global supply chain trends. Watch for 'deflationary' tech cycles to upgrade."
  };

  const tip = lastExpense && categoryTips[lastExpense.category] 
    ? { title: `${lastExpense.category} Insight`, desc: categoryTips[lastExpense.category] }
    : genericTips[activeTip];

  return (
    <div className="glass-card p-6 bg-indigo-50/50 border-indigo-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-500" />
          Arth Lab: Economic Bytes
        </h3>
        {!lastExpense && (
          <button 
            onClick={() => setActiveTip((activeTip + 1) % genericTips.length)}
            className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:underline"
          >
            Next Byte
          </button>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-bold text-indigo-900">{tip.title}</p>
        <p className="text-xs text-indigo-700 leading-relaxed">{tip.desc}</p>
      </div>
    </div>
  );
};

const GoalModal = ({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onAdd: (goal: Omit<Goal, 'id'>) => Promise<void> 
}) => {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onAdd({
      title,
      targetAmount: Number(target),
      currentAmount: Number(current),
    });
    setSaving(false);
    setTitle('');
    setTarget('');
    setCurrent('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Set Financial Goal</h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Goal Title</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Emergency Fund"
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Target Amount</label>
                  <input
                    required
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="5000"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Current Savings</label>
                  <input
                    required
                    type="number"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    placeholder="1000"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>
              <button
                disabled={saving}
                type="submit"
                className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-200 hover:bg-brand-600 transition-all disabled:opacity-50 mt-4"
              >
                {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Create Goal'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Milestones = ({ expenses }: { expenses: Expense[] }) => {
  const milestones = [
    { id: 1, label: "First Log", icon: <Zap className="w-4 h-4" />, achieved: expenses.length >= 1 },
    { id: 2, label: "Data Decoder", icon: <History className="w-4 h-4" />, achieved: expenses.length >= 10 },
    { id: 3, label: "Shield Master", icon: <Shield className="w-4 h-4" />, achieved: expenses.some(e => (e.aiAnalysis?.resilienceStressTest.score || 0) > 80) },
    { id: 4, label: "Inflation Proof", icon: <Clock className="w-4 h-4" />, achieved: expenses.length >= 20 },
    { id: 5, label: "Macro Expert", icon: <Globe className="w-4 h-4" />, achieved: expenses.filter(e => e.aiAnalysis).length >= 15 },
  ];

  return (
    <div className="glass-card p-6">
      <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-brand-500" />
        Economic Milestones
      </h3>
      <div className="flex flex-wrap gap-3">
        {milestones.map((m) => (
          <div 
            key={m.id} 
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
              m.achieved ? "bg-brand-500 text-white shadow-lg shadow-brand-200" : "bg-slate-100 text-slate-400 opacity-50"
            )}
          >
            {m.icon}
            {m.label}
          </div>
        ))}
      </div>
    </div>
  );
};

const GuidedTour = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean, 
  onClose: () => void 
}) => {
  const [step, setStep] = useState(0);
  const steps = [
    { 
      target: 'tour-profile', 
      title: 'Start Here', 
      desc: 'Set your income and essential costs to build your baseline.',
      pos: 'bottom' 
    },
    { 
      target: 'tour-log', 
      title: 'Log Expense', 
      desc: 'Add your daily spending to see AI-powered economic insights.',
      pos: 'top' 
    },
    { 
      target: 'tour-shield', 
      title: 'Watch Your Shield', 
      desc: 'This score shows how strong your financial safety net is against inflation.',
      pos: 'bottom' 
    },
    { 
      target: 'tour-simulator', 
      title: 'Simulate Impact', 
      desc: 'Test "What-If" scenarios to see how spending cuts affect your future.',
      pos: 'left' 
    }
  ];

  const current = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] pointer-events-auto"
            onClick={onClose}
          />
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute z-[110] w-64 bg-white rounded-2xl shadow-2xl p-5 border border-brand-100 pointer-events-auto"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold">
                  {step + 1}
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{current.title}</h4>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">{current.desc}</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div key={i} className={cn("w-1 h-1 rounded-full", i === step ? "bg-brand-500 w-3" : "bg-slate-200")} />
                ))}
              </div>
              <button 
                onClick={handleNext}
                className="bg-brand-500 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-brand-600 transition-all"
              >
                {step === steps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const OnboardingWizard = ({ 
  isOpen, 
  onClose, 
  onComplete 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onComplete: () => void 
}) => {
  const [step, setStep] = useState(1);
  
  const steps = [
    {
      title: "Welcome to Arth-AI",
      desc: "The economic engine that decodes how the world affects your wallet.",
      icon: Zap,
      action: "Next"
    },
    {
      title: "Set Your Baseline",
      desc: "Go to Profile to set your income and essentials. This powers your Shield Score.",
      icon: Shield,
      action: "Got it"
    },
    {
      title: "Log & Decode",
      desc: "Log your first expense to see the Inflation Time Machine in action.",
      icon: Clock,
      action: "Start Exploring"
    }
  ];

  const current = steps[step - 1];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl"
          >
            <div className="w-20 h-20 bg-brand-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-brand-200">
              <current.icon className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-900">{current.title}</h3>
              <p className="text-slate-500 leading-relaxed">{current.desc}</p>
            </div>
            <div className="flex gap-2 justify-center">
              {steps.map((_, i) => (
                <div key={i} className={cn("w-2 h-2 rounded-full transition-all", i + 1 === step ? "w-6 bg-brand-500" : "bg-slate-200")} />
              ))}
            </div>
            <button
              onClick={() => {
                if (step < steps.length) setStep(step + 1);
                else {
                  onComplete();
                  onClose();
                }
              }}
              className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-brand-600 transition-all"
            >
              {current.action}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [timeRange, setTimeRange] = useState<'7D' | '1M' | '6M' | '1Y'>('7D');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch or create profile
        const profileRef = doc(db, 'users', u.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as UserProfile);
        } else {
          setShowOnboarding(true);
          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || 'User',
            photoURL: u.photoURL || '',
            createdAt: Date.now(),
            currency: 'USD'
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        }

        // Listen for expenses
        const q = query(
          collection(db, 'expenses'),
          where('uid', '==', u.uid),
          orderBy('date', 'desc')
        );
        
        const unsubExpenses = onSnapshot(q, (snapshot) => {
          const exps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
          setExpenses(exps);
          setLoading(false);
        });

        return () => unsubExpenses();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Sign-in error:", error);
      setAuthError(error.message || "Failed to sign in with Google.");
    }
  };

  const handleUpdateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const profileRef = doc(db, 'users', user.uid);
    await setDoc(profileRef, data, { merge: true });
    setProfile(prev => prev ? { ...prev, ...data } : null);
  };

  const handleAddGoal = async (goal: Omit<Goal, 'id'>) => {
    if (!user || !profile) return;
    const newGoal: Goal = { ...goal, id: Math.random().toString(36).substr(2, 9) };
    const updatedGoals = [...(profile.goals || []), newGoal];
    await handleUpdateProfile({ goals: updatedGoals });
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount) return;

    setAnalyzing(true);
    try {
      const aiAnalysis = await analyzeExpense(
        Number(amount), 
        category, 
        description,
        {
          income: profile?.monthlyIncome,
          essentials: profile?.essentialExpenses,
          customInflation: profile?.customInflationRate
        }
      );
      
      await addDoc(collection(db, 'expenses'), {
        uid: user.uid,
        amount: Number(amount),
        category,
        description,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        date: Date.now(),
        aiAnalysis
      });

      setAmount('');
      setDescription('');
      setTags('');
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("Failed to analyze expense. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const displayExpenses = useMemo(() => {
    return isDemoMode ? MOCK_EXPENSES : expenses;
  }, [isDemoMode, expenses]);

  const displayProfile = useMemo(() => {
    if (isDemoMode) {
      return {
        ...profile,
        monthlyIncome: 8000,
        essentialExpenses: 3000,
        customInflationRate: 6.5,
        budgets: { Groceries: 600, Travel: 1000, Shopping: 500 },
        goals: MOCK_GOALS,
        streak: 12,
        badges: ['saver', 'analyst', 'hedger']
      } as UserProfile;
    }
    return profile;
  }, [isDemoMode, profile]);

  const chartData = useMemo(() => {
    let length = 7;
    let formatStr = 'MMM dd';
    const now = new Date();
    const startDate = new Date();
    
    if (timeRange === '1M') {
      length = 30;
      startDate.setDate(now.getDate() - 30);
    } else if (timeRange === '6M') {
      length = 6;
      formatStr = 'MMM yyyy';
      startDate.setMonth(now.getMonth() - 6);
    } else if (timeRange === '1Y') {
      length = 12;
      formatStr = 'MMM yyyy';
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate.setDate(now.getDate() - 7);
    }

    const labels = Array.from({ length }, (_, i) => {
      const d = new Date(now);
      if (timeRange === '1Y' || timeRange === '6M') {
        d.setMonth(now.getMonth() - i, 1);
        return { label: format(d, formatStr), timestamp: d.getTime() };
      }
      d.setDate(now.getDate() - i);
      return { label: format(d, formatStr), timestamp: d.getTime() };
    }).reverse();

    const categories = ['Groceries', 'Utilities', 'Entertainment', 'Travel', 'Healthcare', 'Transport', 'Shopping', 'Other'];
    const filteredExpenses = displayExpenses.filter(e => e.date >= startDate.getTime());

    return labels.map(({ label }) => {
      const dataPoint: any = { name: label };
      categories.forEach(cat => {
        const amount = filteredExpenses
          .filter(e => e.category === cat && format(new Date(e.date), formatStr) === label)
          .reduce((sum, e) => sum + e.amount, 0);
        dataPoint[cat] = amount;
      });
      dataPoint.total = categories.reduce((sum, cat) => sum + dataPoint[cat], 0);
      return dataPoint;
    });
  }, [displayExpenses, timeRange]);

  const totalSpent = useMemo(() => displayExpenses.reduce((sum, e) => sum + e.amount, 0), [displayExpenses]);
  
  const categoryBreakdown = useMemo(() => {
    const breakdown: { [key: string]: number } = {};
    displayExpenses.forEach(e => {
      breakdown[e.category] = (breakdown[e.category] || 0) + e.amount;
    });
    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [displayExpenses]);

  const avgShieldScore = useMemo(() => {
    const scored = displayExpenses.filter(e => e.aiAnalysis);
    if (scored.length === 0) return 0;
    const sum = scored.reduce((s, e) => s + (e.aiAnalysis?.resilienceStressTest.score || 0), 0);
    return Number((sum / scored.length).toFixed(1));
  }, [displayExpenses]);

  if (loading) return <LoadingScreen />;
  if (!user && !isDemoMode) {
    return (
      <AuthScreen
        onSignIn={handleSignIn}
        onDemoMode={() => setIsDemoMode(true)}
        error={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {isDemoMode && (
        <div className="bg-brand-500 text-white text-[10px] font-bold text-center py-1.5 uppercase tracking-[0.3em] relative z-50">
          Hackonomics 2026 • Demo Environment Active
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo isDemo={isDemoMode} />
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                isDemoMode ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {isDemoMode ? 'Demo Active' : 'Demo Mode'}
            </button>
            <button 
              onClick={() => setIsProfileOpen(true)}
              id="tour-profile"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors flex items-center gap-2"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-semibold">Profile</span>
            </button>
            <button 
              onClick={logout}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8 brand-grid min-h-screen">
        {/* Budget Alerts */}
        {displayProfile?.budgets && (
          <BudgetAlert expenses={displayExpenses} budgets={displayProfile.budgets} />
        )}

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-200/50 rounded-2xl w-fit mx-auto sm:mx-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'dashboard' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'history' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <>
            {/* Stats Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 stat-card flex items-center gap-6 relative overflow-hidden group" id="tour-shield">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <HealthGauge score={Math.round(avgShieldScore)} />
                <div className="flex-1 space-y-2 relative z-10">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-bold text-slate-900">Economic Resilience</h3>
                    <span className="text-[10px] text-slate-400 font-medium">How strong your financial safety net is</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {getShieldLevel(Math.round(avgShieldScore)).desc}
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowOnboarding(true)}
                      className="text-[10px] font-bold text-brand-500 hover:underline"
                    >
                      Re-run Onboarding →
                    </button>
                    <button 
                      onClick={() => setIsTourOpen(true)}
                      className="text-[10px] font-bold text-slate-400 hover:underline"
                    >
                      Quick Tour
                    </button>
                  </div>
                </div>
              </div>

              <div className="stat-card flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-lg",
                      (chartData[chartData.length-1]?.total || 0) > (chartData[chartData.length-2]?.total || 0) ? "text-red-500 bg-red-50" : "text-emerald-500 bg-emerald-50"
                    )}>
                      {(chartData[chartData.length-1]?.total || 0) > (chartData[chartData.length-2]?.total || 0) ? '+' : ''}
                      {((((chartData[chartData.length-1]?.total || 0) - (chartData[chartData.length-2]?.total || 0)) / (chartData[chartData.length-2]?.total || 1)) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Spent</p>
                  <p className="text-2xl font-black text-slate-900">${totalSpent.toLocaleString()}</p>
                </div>
              </div>

              <div className="stat-card flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Active</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Expenses</p>
                  <p className="text-2xl font-black text-slate-900">{expenses.length}</p>
                </div>
              </div>

              <StreakCounter streak={displayProfile?.streak} />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Spending Velocity */}
              <div className="lg:col-span-2 glass-card p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <div className="flex flex-col">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-brand-500" />
                      Spending Velocity
                    </h2>
                    <span className="text-[10px] text-slate-400 font-medium ml-7">How fast your spending is growing over time</span>
                  </div>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    {(['7D', '1M', '6M', '1Y'] as const).map(range => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                          timeRange === range ? "bg-white text-brand-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                          <linearGradient key={cat} id={`color-${cat}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.1}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '12px', 
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        labelStyle={{ fontWeight: 700, marginBottom: '4px' }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      />
                      {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                        <Area 
                          key={cat}
                          type="monotone" 
                          dataKey={cat} 
                          stackId="1"
                          stroke={color} 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill={`url(#color-${cat})`} 
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="glass-card p-6">
                <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-6">
                  <PieChart className="w-5 h-5 text-brand-500" />
                  Category Mix
                </h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#cbd5e1'} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '12px', 
                          border: '1px solid #e2e8f0'
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {categoryBreakdown.slice(0, 4).map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#cbd5e1' }} />
                        <span className="text-xs font-bold text-slate-600">{cat.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-900">${cat.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-1 space-y-8">
                <div id="tour-simulator">
                  <EconomicSimulator currentScore={Math.round(avgShieldScore)} currentInflation={displayProfile?.customInflationRate || 6.5} />
                </div>
                <Milestones expenses={displayExpenses} />
                <BadgeGallery badges={displayProfile?.badges} />
                <div className="grid grid-cols-1 gap-6">
                  <GoalsCard 
                    goals={displayProfile?.goals || []} 
                    onAddGoal={() => setIsGoalModalOpen(true)} 
                    onAddTemplate={(title, target) => handleAddGoal({ title, targetAmount: target, currentAmount: 0, category: 'Other' })}
                  />
                  <CommunityBenchmarks income={displayProfile?.monthlyIncome} />
                  <ArthLab lastExpense={displayExpenses[0]} />
                  <BudgetProgress expenses={displayExpenses} budgets={displayProfile?.budgets || {}} />
                  <QuickTips />
                </div>
              </div>
            </div>

            {/* Recent Expenses List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-brand-500" />
                  Economic Ledger
                </h2>
                <button 
                  onClick={() => setIsAdding(true)}
                  id="tour-log"
                  className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-brand-200 hover:bg-brand-600 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Log Expense
                </button>
              </div>

              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {displayExpenses.slice(0, 5).map((expense) => (
                    <motion.div
                      key={expense.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01, x: 4 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedExpense(expense)}
                      className="glass-card p-5 flex items-center justify-between cursor-pointer border-white/40 hover:border-brand-300/50 hover:bg-white transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                          {expense.category === 'Groceries' && <Zap className="w-6 h-6" />}
                          {expense.category === 'Transport' && <Globe className="w-6 h-6" />}
                          {expense.category === 'Shopping' && <Wallet className="w-6 h-6" />}
                          {!['Groceries', 'Transport', 'Shopping'].includes(expense.category) && <BarChart3 className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{expense.description || expense.category}</p>
                          <p className="text-xs text-slate-400 font-medium">{format(expense.date, 'MMM dd, yyyy • HH:mm')}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="font-mono font-bold text-slate-900">-${expense.amount.toFixed(2)}</p>
                          {expense.aiAnalysis && (
                            <div className="flex items-center gap-1 justify-end">
                              <Shield className="w-3 h-3 text-indigo-500" />
                              <span className="text-[10px] font-bold text-indigo-500">{expense.aiAnalysis.resilienceStressTest.score}/10</span>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 transition-colors" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {displayExpenses.length === 0 && (
                  <div className="text-center py-12 glass-card border-dashed bg-slate-50/50">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6 text-slate-300">
                      <History className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Your Economic Ledger is Empty</h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto mb-8">Start decoding your economy by logging your first expense or exploring the demo mode.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
                      <div className="p-4 rounded-2xl bg-white border border-slate-100 text-left">
                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold mb-3">1</div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Baseline</p>
                        <p className="text-xs font-bold text-slate-900">Set your income & essentials in Profile</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white border border-slate-100 text-left">
                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold mb-3">2</div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Log</p>
                        <p className="text-xs font-bold text-slate-900">Add an expense with tags for AI analysis</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white border border-slate-100 text-left">
                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold mb-3">3</div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Shield</p>
                        <p className="text-xs font-bold text-slate-900">Watch your Economic Shield evolve</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button 
                        onClick={() => setIsTourOpen(true)}
                        className="inline-flex items-center gap-2 bg-white text-brand-600 border border-brand-200 px-6 py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-brand-50 transition-all active:scale-95"
                      >
                        <Target className="w-4 h-4" />
                        Start Quick Tour
                      </button>
                      <button 
                        onClick={() => setIsDemoMode(true)}
                        className="inline-flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl shadow-brand-200 hover:bg-brand-600 transition-all active:scale-95"
                      >
                        <Zap className="w-4 h-4" />
                        Explore with Demo Data
                      </button>
                    </div>
                  </div>
                )}

                {displayExpenses.length > 5 && (
                  <button 
                    onClick={() => setActiveTab('history')}
                    className="w-full py-3 text-sm font-bold text-brand-500 hover:text-brand-600 transition-colors"
                  >
                    View All Transactions
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <TransactionHistory expenses={displayExpenses} onSelect={setSelectedExpense} />
        )}
      </main>

        <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-slate-200 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all cursor-pointer">
            <Zap className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-900">Arth-AI Economic Engine</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Made by{' '}
            <a 
              href="https://yashchoubey.netlify.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-brand-500 font-bold hover:underline inline-flex items-center gap-1"
            >
              Code with Yash <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </footer>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !analyzing && setIsAdding(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Log New Expense</h3>
                <button 
                  onClick={() => setIsAdding(false)}
                  disabled={analyzing}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Amount ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={analyzing}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-mono text-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={analyzing}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-slate-700 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all appearance-none"
                  >
                    <option>Groceries</option>
                    <option>Utilities</option>
                    <option>Entertainment</option>
                    <option>Travel</option>
                    <option>Healthcare</option>
                    <option>Transport</option>
                    <option>Shopping</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What did you buy?"
                    disabled={analyzing}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-medium text-slate-700 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Tags (comma separated)</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="vacation, gift, work"
                      disabled={analyzing}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 font-medium text-slate-700 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={analyzing || !amount}
                  className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-200 hover:bg-brand-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      AI Analyzing Economy...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Log & Analyze
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Analysis Detail Modal */}
      <AnimatePresence>
        {selectedExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedExpense(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedExpense.description || selectedExpense.category}</h3>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {format(selectedExpense.date, 'MMMM dd, yyyy')} • ${selectedExpense.amount.toFixed(2)}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedExpense(null)}
                  className="p-3 rounded-full hover:bg-white text-slate-400 shadow-sm border border-slate-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto custom-scrollbar">
                {selectedExpense.aiAnalysis ? (
                  <AnalysisCard analysis={selectedExpense.aiAnalysis} />
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">No AI analysis available for this record.</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Arth-AI Economic Engine • Hackonomics 2026</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ChatInterface isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        profile={profile}
        onUpdate={handleUpdateProfile}
      />

      <OnboardingWizard 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
        onComplete={() => setShowOnboarding(false)} 
      />

      <GoalModal 
        isOpen={isGoalModalOpen} 
        onClose={() => setIsGoalModalOpen(false)} 
        onAdd={handleAddGoal} 
      />

      <GuidedTour 
        isOpen={isTourOpen} 
        onClose={() => setIsTourOpen(false)} 
      />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        <button 
          onClick={() => setIsChatOpen(true)}
          className="w-14 h-14 bg-white text-brand-500 border border-slate-200 rounded-2xl shadow-xl flex items-center justify-center hover:bg-slate-50 transition-all active:scale-90"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-14 h-14 bg-brand-500 text-white rounded-2xl shadow-2xl shadow-brand-400 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      <div className="fixed bottom-4 left-4 opacity-5 pointer-events-none select-none hidden sm:block">
        <span className="text-6xl font-black uppercase tracking-tighter text-slate-900">Arth-AI</span>
      </div>
    </div>
  );
}

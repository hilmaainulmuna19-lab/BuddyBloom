import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  PieChart, 
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  BarChart2
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { Transaction, FinancialGoal, UserProfile } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell } from 'recharts';
import { AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';

interface FinancialTrackerProps {
  user: User;
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
}

export default function FinancialTracker({ user, profile, setProfile }: FinancialTrackerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const transactionsPath = 'transactions';
    const qTrans = query(collection(db, transactionsPath), where('userId', '==', user.uid));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, transactionsPath);
    });

    const goalsPath = 'goals';
    const qGoals = query(collection(db, goalsPath), where('userId', '==', user.uid));
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialGoal)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, goalsPath);
    });

    return () => {
      unsubTrans();
      unsubGoals();
    };
  }, [user.uid]);

  const addTransaction = async () => {
    if (!amount || !category) return;
    const path = 'transactions';
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        type,
        amount: parseFloat(amount),
        category,
        note,
        date: today,
        createdAt: new Date().toISOString()
      });
      
      // Add EXP
      if (profile) {
        const newExp = profile.exp + 5;
        const newLevel = Math.floor(newExp / 100) + 1;
        const updatedProfile = { ...profile, exp: newExp, level: newLevel };
        await updateDoc(doc(db, 'user_profiles', user.uid), updatedProfile);
        setProfile(updatedProfile);
      }

      setAmount('');
      setCategory('');
      setNote('');
      setShowAdd(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalInvestment = transactions.filter(t => t.category === 'Investasi').reduce((sum, t) => sum + t.amount, 0);
  const totalSavings = totalIncome - totalExpense;
  const balance = totalIncome - totalExpense;

  const calculateProjection = (goal: FinancialGoal) => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    if (progress >= 100) return 'Tercapai! 🥳';
    if (goal.currentAmount === 0) return 'Ayo mulai menabung! 💪';

    // Projection logic: Use goal age to estimate monthly savings
    const createdDate = new Date(goal.createdAt);
    const monthsElapsed = Math.max(0.5, (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    const monthlyRate = goal.currentAmount / monthsElapsed;

    if (monthlyRate <= 0) return 'Belum ada progres';

    const remaining = goal.targetAmount - goal.currentAmount;
    const monthsRemaining = Math.max(1, Math.ceil(remaining / monthlyRate));
    
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + monthsRemaining);
    
    return `Estimasi: ${format(projectedDate, 'MMM yyyy')}`;
  };

  // Chart Data
  const chartData = transactions
    .filter(t => t.type === 'expense')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7)
    .map(t => ({ date: t.date.slice(5), amount: t.amount }));

  // Pie Data
  const categoryData = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
  
  const pieData = Object.keys(categoryData).map(cat => ({ name: cat, value: categoryData[cat] }));
  const COLORS = ['#4299E1', '#319795', '#0288D1', '#F6AD55', '#A0AEC0'];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-display font-semibold text-natural-text uppercase tracking-widest leading-none">Financial Summary</h2>
          <p className="text-[10px] text-natural-teal-text font-bold uppercase tracking-widest mt-1 leading-none">
            Tracking your future
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowReport(true)}
            className="p-3 bg-natural-teal text-natural-teal-text rounded-full shadow-lg hover:scale-110 transition-transform"
          >
            <BarChart2 size={24} />
          </button>
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="p-3 bg-natural-pink text-natural-pink-text rounded-full shadow-lg hover:scale-110 transition-transform"
          >
            {showAdd ? <XIcon /> : <Plus />}
          </button>
        </div>
      </div>

      {/* Monthly Report Modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 max-h-[90vh] overflow-y-auto relative"
            >
              <button 
                onClick={() => setShowReport(false)}
                className="absolute top-6 right-6 p-2 text-natural-purple-text hover:text-red-400"
              >
                <XIcon />
              </button>
              
              <h3 className="font-cute text-2xl text-natural-text mb-2">Laporan Bulanan ✨</h3>
              <p className="text-xs font-bold text-natural-purple-text uppercase tracking-widest mb-8">Ringkasan Keuangan Kamu</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-natural-teal p-4 rounded-3xl">
                  <p className="text-[9px] font-bold text-natural-teal-text uppercase">Income</p>
                  <p className="font-display font-bold text-natural-text">Rp {totalIncome.toLocaleString()}</p>
                </div>
                <div className="bg-natural-pink p-4 rounded-3xl">
                  <p className="text-[9px] font-bold text-natural-pink-text uppercase">Expense</p>
                  <p className="font-display font-bold text-natural-text">Rp {totalExpense.toLocaleString()}</p>
                </div>
                <div className="bg-natural-purple p-4 rounded-3xl">
                  <p className="text-[9px] font-bold text-natural-purple-text uppercase">Investasi</p>
                  <p className="font-display font-bold text-natural-text">Rp {totalInvestment.toLocaleString()}</p>
                </div>
                <div className="bg-natural-yellow/20 p-4 rounded-3xl">
                  <p className="text-[9px] font-bold text-natural-yellow uppercase">Tabungan</p>
                  <p className="font-display font-bold text-natural-text">Rp {totalSavings.toLocaleString()}</p>
                </div>
              </div>

              <div className="h-64 w-full mb-8">
                <p className="text-center text-xs font-bold text-natural-purple-text mb-4">Pengeluaran per Kategori</p>
                <ResponsiveContainer width="100%" height="100%">
                  <RePie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePie>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-natural-purple-text uppercase tracking-widest">Identifikasi Hemat</p>
                <div className="bg-natural-bg p-4 rounded-2xl text-xs italic text-natural-text">
                  "{totalExpense > totalIncome * 0.7 ? "Wah, pengeluaranmu sudah lebih dari 70% pendapatan nih. Coba batasi kategori hiburan ya!" : "Keren! Kamu masih punya banyak sisa saldo untuk ditabung."}"
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balance Summary Card */}
      <div className="glass-card p-6 bg-white border border-natural-border shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-natural-purple-text uppercase tracking-widest opacity-80">Total Balance</p>
          <div className="flex items-end gap-2 mt-1">
            <h3 className="text-3xl font-semibold text-natural-text">Rp {balance.toLocaleString('id-ID')}</h3>
            <span className="text-[10px] text-natural-teal-text font-bold mb-1 opacity-70">Saved this month</span>
          </div>
          
          <div className="flex mt-8 gap-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-natural-teal rounded-lg flex items-center justify-center text-natural-teal-text">
                <TrendingUp size={16} />
              </div>
              <div>
                <p className="text-[9px] text-natural-purple-text uppercase font-black tracking-tighter">Inflow</p>
                <p className="font-bold text-xs text-natural-text">Rp {totalIncome.toLocaleString('id-ID')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-natural-pink rounded-lg flex items-center justify-center text-natural-pink-text">
                <TrendingDown size={16} />
              </div>
              <div>
                <p className="text-[9px] text-natural-purple-text uppercase font-black tracking-tighter">Outflow</p>
                <p className="font-bold text-xs text-natural-text">Rp {totalExpense.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>
        <Wallet className="absolute right-[-40px] bottom-[-40px] w-48 h-48 opacity-5 text-natural-text -rotate-12" />
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-6 bg-white space-y-4 border-2 border-dashed border-natural-pink">
          <div className="flex bg-natural-bg p-1 rounded-2xl">
            <button 
              onClick={() => setType('expense')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${type === 'expense' ? 'bg-white text-natural-pink-text shadow-sm' : 'text-natural-purple-text'}`}
            >
              Expense
            </button>
            <button 
              onClick={() => setType('income')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${type === 'income' ? 'bg-white text-natural-teal-text shadow-sm' : 'text-natural-purple-text'}`}
            >
              Income
            </button>
          </div>
          
          <div className="space-y-4 text-sm">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-natural-text opacity-40">Rp</span>
              <input 
                type="number" 
                placeholder="0" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-4 pl-12 bg-natural-bg rounded-2xl focus:outline-none focus:ring-2 focus:ring-natural-teal-accent border-none font-bold text-lg"
              />
            </div>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-4 bg-natural-bg rounded-2xl focus:outline-none focus:ring-2 focus:ring-natural-teal-accent border-none font-medium"
            >
              <option value="">Category</option>
              <option value="Makan">🍱 Food & Drinks</option>
              <option value="Transport">🚗 Transport</option>
              <option value="Belanja">🛍️ Shopping</option>
              <option value="Investasi">📈 Investment</option>
              <option value="Lainnya">✨ Others</option>
            </select>
            <input 
              type="text" 
              placeholder="A short note..." 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-4 bg-natural-bg rounded-2xl focus:outline-none focus:ring-2 focus:ring-natural-teal-accent border-none"
            />
            <button 
              onClick={addTransaction}
              className="w-full py-4 bg-natural-pink-text text-white font-bold rounded-2xl shadow-md hover:brightness-110 tracking-widest uppercase text-xs"
            >
              Add Record
            </button>
          </div>
        </motion.div>
      )}

      {/* Monthly Chart Section */}
      <section className="glass-card p-6 bg-white overflow-hidden">
        <h3 className="text-xs font-bold text-natural-purple-text uppercase tracking-widest flex items-center gap-2 mb-8">
          Weekly Insight
        </h3>
        <div className="h-40 w-full flex items-end gap-2 px-2">
          {chartData.length > 0 ? (
            chartData.map((d, i) => {
              const maxAmt = Math.max(...chartData.map(cd => cd.amount)) || 1;
              const height = (d.amount / maxAmt) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center group">
                  <div 
                    className={`w-full rounded-t-lg transition-all duration-500 relative ${i === chartData.length - 1 ? 'bg-natural-pink' : 'bg-natural-purple'}`}
                    style={{ height: `${Math.max(10, height)}%` }}
                  >
                     {i === chartData.length - 1 && (
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-natural-text text-white px-1.5 py-0.5 rounded-md whitespace-nowrap">
                         Rp {d.amount.toLocaleString()}
                       </div>
                     )}
                  </div>
                  <span className="text-[8px] mt-2 font-bold text-natural-purple-text uppercase">{d.date}</span>
                </div>
              );
            })
          ) : (
            <div className="flex-1 py-8 text-center text-[10px] text-natural-purple-text italic opacity-40">Add expenses to see trend</div>
          )}
        </div>
      </section>

      {/* Goals Section */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-natural-text uppercase tracking-widest flex items-center justify-between">
          <span>Target Finansial 🎯</span>
          <span className="text-[8px] opacity-40 font-medium">Berdasarkan tabunganmu</span>
        </h3>
        <div className="grid gap-4">
          {goals.map(goal => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            return (
              <div key={goal.id} className="glass-card p-6 bg-white border border-natural-border shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-natural-text">{goal.name}</h4>
                    <p className="text-[10px] text-natural-purple-text font-bold uppercase tracking-widest">{calculateProjection(goal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-natural-text/40 leading-none mb-1">Target</p>
                    <p className="text-[10px] font-bold text-natural-text leading-none">Rp {goal.targetAmount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter">
                    <span className="text-natural-text/40">Rp {goal.currentAmount.toLocaleString()} terkumpul</span>
                    <span className="text-natural-teal-text">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-3 w-full bg-natural-bg rounded-full overflow-hidden p-[2px] shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, progress)}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className={`h-full rounded-full shadow-sm ${progress >= 100 ? 'bg-natural-teal-text' : 'soft-gradient-blue'}`} 
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-natural-border grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-natural-text/30 uppercase">Sisa</span>
                    <span className="text-[10px] font-bold text-natural-text">Rp {(goal.targetAmount - goal.currentAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[8px] font-bold text-natural-text/30 uppercase">Deadline</span>
                    <span className="text-[10px] font-bold text-natural-pink-text">{format(new Date(goal.deadline), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {goals.length === 0 && (
            <div className="glass-card p-6 bg-white border-2 border-dashed border-natural-border flex flex-col items-center text-center opacity-40">
              <span className="text-2xl mb-2">🏖️</span>
              <p className="text-[10px] font-bold uppercase tracking-tighter">Plan your next adventure!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

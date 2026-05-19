import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Check, 
  X, 
  Trash2, 
  Sparkles,
  Zap,
  Heart,
  Brain,
  Coffee,
  Users,
  Sun,
  Moon,
  Info,
  Edit,
  ChevronRight,
  TrendingUp,
  Flame,
  Calendar,
  Award
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, limit, orderBy } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { Habit, HabitLog, UserProfile, Journal } from '../types';
import { format, subDays, isYesterday, isToday, parseISO } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';

interface HabitTrackerProps {
  user: User;
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
}

const categories: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  morning: { label: 'Morning Routine', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50' },
  spiritual: { label: 'Spiritual & Inner Peace', icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  productivity: { label: 'Productivity & Learning', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50' },
  health: { label: 'Health & Body', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
  mental: { label: 'Mental & Self Healing', icon: Brain, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  night: { label: 'Night Routine', icon: Moon, color: 'text-slate-500', bg: 'bg-slate-50' },
};

const difficulties = {
  easy: { label: 'Easy', exp: 5, color: 'text-green-500' },
  medium: { label: 'Medium', exp: 15, color: 'text-blue-500' },
  hard: { label: 'Hard', exp: 30, color: 'text-purple-500' },
};

const balancedTemplates = [
  // Morning
  { name: 'Bangun tepat waktu', icon: '⏰', category: 'morning', difficulty: 'medium', description: 'Starting the day with intention.' },
  { name: 'Minum air putih', icon: '💧', category: 'morning', difficulty: 'easy', description: 'Rehydrate your body after sleep.' },
  { name: 'Kena sinar matahari pagi', icon: '☀️', category: 'morning', difficulty: 'easy', description: 'Reset your circadian rhythm.' },
  { name: 'Rapihin tempat tidur', icon: '🛏️', category: 'morning', difficulty: 'easy', description: 'A small win to start the day.' },
  { name: 'Sarapan / makan pagi', icon: '🍳', category: 'morning', difficulty: 'easy', description: 'Fuel for your brain and body.' },
  // Spiritual
  { name: 'Sholat Subuh', icon: '🕌', category: 'spiritual', difficulty: 'medium', description: 'Spiritual connection at dawn.' },
  { name: 'Sholat Dzuhur', icon: '🕌', category: 'spiritual', difficulty: 'easy', description: 'Midday reflection.' },
  { name: 'Sholat Ashar', icon: '🕌', category: 'spiritual', difficulty: 'easy', description: 'Afternoon pause.' },
  { name: 'Sholat Maghrib', icon: '🕌', category: 'spiritual', difficulty: 'easy', description: 'Evening gratitude.' },
  { name: 'Sholat Isya', icon: '🕌', category: 'spiritual', difficulty: 'easy', description: 'Final prayer of the day.' },
  { name: 'Tadarus / baca Al-Qur’an', icon: '📖', category: 'spiritual', difficulty: 'medium', description: 'Seeking wisdom and peace.' },
  { name: 'Dzikir / doa sebentar', icon: '📿', category: 'spiritual', difficulty: 'easy', description: 'Maintaining inner peace.' },
  // Productivity
  { name: 'Fokus pada prioritas', icon: '🎯', category: 'productivity', difficulty: 'hard', description: 'Doing what actually matters.' },
  { name: 'Belajar hal baru', icon: '📚', category: 'productivity', difficulty: 'medium', description: 'Continuous growth.' },
  { name: 'Progress project', icon: '🚀', category: 'productivity', difficulty: 'hard', description: 'Moving forward step by step.' },
  { name: 'Kurangi overthinking', icon: '🧠', category: 'productivity', difficulty: 'medium', description: 'Protect your mental energy.' },
  { name: 'Rapihin file/catatan', icon: '📁', category: 'productivity', difficulty: 'easy', description: 'Clarity in your workspace.' },
  // Health
  { name: 'Minum air ±2L', icon: '🚰', category: 'health', difficulty: 'medium', description: 'Essential for every cell.' },
  { name: 'Makan sehat', icon: '🥗', category: 'health', difficulty: 'medium', description: 'Nourishing your body.' },
  { name: 'Stretching / olahraga', icon: '🧘', category: 'health', difficulty: 'medium', description: 'Movement is medicine.' },
  { name: 'Jalan santai / jogging', icon: '👟', category: 'health', difficulty: 'medium', description: 'Fresh air and light cardio.' },
  { name: 'Istirahat dari layar', icon: '📵', category: 'health', difficulty: 'easy', description: 'Eye and mind rest.' },
  // Mental
  { name: 'Denger lagu tenang', icon: '🎶', category: 'mental', difficulty: 'easy', description: 'Audio therapy.' },
  { name: 'Self healing', icon: '🌱', category: 'mental', difficulty: 'medium', description: 'No guilt, just rest.' },
  { name: 'Ngobrol sama orang', icon: '💬', category: 'mental', difficulty: 'medium', description: 'Human connection.' },
  { name: 'No comparison', icon: '🛡️', category: 'mental', difficulty: 'hard', description: 'Your journey is unique.' },
  { name: 'Bersyukur progress kecil', icon: '✨', category: 'mental', difficulty: 'easy', description: 'Acknowledging your effort.' },
  // Night
  { name: 'Kurangi screen time', icon: '🌙', category: 'night', difficulty: 'medium', description: 'Preparing for deep rest.' },
  { name: 'Refleksi singkat', icon: '📝', category: 'night', difficulty: 'easy', description: 'Reviewing the day with kindness.' },
  { name: 'Tidur cukup', icon: '💤', category: 'night', difficulty: 'hard', description: 'The foundation of health.' },
];

export default function HabitTracker({ user, profile, setProfile }: HabitTrackerProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [weeklyLogs, setWeeklyLogs] = useState<HabitLog[]>([]);
  const [todayJournal, setTodayJournal] = useState<Journal | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // New Habit State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('morning');
  const [difficulty, setDifficulty] = useState<keyof typeof difficulties>('easy');
  const [description, setDescription] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const habitsPath = 'habits';
    const qHabits = query(collection(db, habitsPath), where('userId', '==', user.uid));
    
    const unsubHabits = onSnapshot(qHabits, async (snapshot) => {
      const fetchedHabits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit));
      
      // Auto-reset streaks if missed
      for (const h of fetchedHabits) {
        if (h.streak > 0 && h.lastCompleted) {
          const lastDate = parseISO(h.lastCompleted);
          if (!isToday(lastDate) && !isYesterday(lastDate)) {
            await updateDoc(doc(db, 'habits', h.id!), { streak: 0 });
          }
        }
      }
      
      setHabits(fetchedHabits);

      // Auto-seed if empty
      if (snapshot.empty) {
        // We only seed a few essential ones to not overwhelm, or all if requested
        // Let's seed a small curated list of the user's template
        const defaults = [
          { name: 'Bangun tepat waktu', icon: '⏰', category: 'morning', difficulty: 'medium', description: 'Starting the day with intention.' },
          { name: 'Minum air putih', icon: '💧', category: 'morning', difficulty: 'easy', description: 'Rehydrate your body.' },
          { name: 'Sholat / Ibadah', icon: '🕌', category: 'spiritual', difficulty: 'medium', description: 'Spiritual connection.' },
          { name: 'Makan sehat', icon: '🥗', category: 'health', difficulty: 'medium', description: 'Fueling your body.' },
          { name: 'Tidur cukup', icon: '💤', category: 'night', difficulty: 'hard', description: 'The foundation of health.' },
        ];
        
        for (const d of defaults) {
          await addDoc(collection(db, habitsPath), {
            ...d,
            userId: user.uid,
            frequency: 'daily',
            createdAt: new Date().toISOString()
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, habitsPath);
    });

    const logsPath = 'habit_logs';
    const qLogs = query(collection(db, logsPath), where('userId', '==', user.uid), where('date', '==', today));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HabitLog)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, logsPath);
    });

    const oneWeekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    const qWeeklyLogs = query(collection(db, logsPath), where('userId', '==', user.uid), where('date', '>=', oneWeekAgo));
    const unsubWeekly = onSnapshot(qWeeklyLogs, (snapshot) => {
      setWeeklyLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HabitLog)));
    });

    // Fetch Today's Mood
    const journalsPath = 'journals';
    const qJournal = query(collection(db, journalsPath), where('userId', '==', user.uid), where('date', '==', today));
    const unsubJournal = onSnapshot(qJournal, (snapshot) => {
      if (!snapshot.empty) setTodayJournal(snapshot.docs[0].data() as Journal);
    });

    return () => {
      unsubHabits();
      unsubLogs();
      unsubJournal();
    };
  }, [user.uid, today]);

  const saveHabit = async () => {
    if (!name.trim()) return;
    const path = 'habits';
    const habitData = {
      userId: user.uid,
      name,
      description,
      category,
      difficulty,
      icon: categories[category].icon.name, // Just as a placeholder
      frequency: 'daily',
      streak: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      if (editingHabit) {
        await updateDoc(doc(db, path, editingHabit.id!), habitData);
      } else {
        await addDoc(collection(db, path), habitData);
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('morning');
    setDifficulty('easy');
    setEditingHabit(null);
    setShowAdd(false);
  };

  const toggleHabit = async (habit: Habit) => {
    const existingLog = logs.find(l => l.habitId === habit.id);
    const logsPath = 'habit_logs';
    try {
      if (existingLog) {
        await deleteDoc(doc(db, logsPath, existingLog.id!));
        
        // Decrease streak if needed (simplified: just decrement)
        const newStreak = Math.max(0, (habit.streak || 1) - 1);
        await updateDoc(doc(db, 'habits', habit.id!), { streak: newStreak });
      } else {
        await addDoc(collection(db, logsPath), {
          habitId: habit.id,
          userId: user.uid,
          date: today,
          completed: true,
          timestamp: new Date().toISOString()
        });
        
        // Update Streak
        let newStreak = 1;
        if (habit.lastCompleted) {
          const lastDate = parseISO(habit.lastCompleted);
          if (isYesterday(lastDate)) {
            newStreak = (habit.streak || 0) + 1;
          } else if (isToday(lastDate)) {
            newStreak = habit.streak || 1;
          }
        }
        await updateDoc(doc(db, 'habits', habit.id!), { 
          streak: newStreak,
          lastCompleted: today
        });
        
        // Award EXP based on difficulty
        if (profile) {
          const expGain = difficulties[habit.difficulty].exp;
          const newExp = profile.exp + expGain;
          const newLevel = Math.floor(newExp / 100) + 1;
          const updatedProfile = { ...profile, exp: newExp, level: newLevel };
          await updateDoc(doc(db, 'user_profiles', user.uid), updatedProfile);
          setProfile(updatedProfile);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, logsPath);
    }
  };

  const deleteHabit = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'habits', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'habits');
    }
  };

  const startEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setName(habit.name);
    setDescription(habit.description || '');
    setCategory(habit.category);
    setDifficulty(habit.difficulty);
    setShowAdd(true);
  };

  const energyLevel = todayJournal?.mood === 'sad' || todayJournal?.mood === 'angry' ? 'low' : 
                   todayJournal?.mood === 'happy' || todayJournal?.mood === 'love' ? 'high' : 'medium';

  const last7Days = Array.from({ length: 7 }).map((_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
  const weeklyCompletionRate = last7Days.map(date => {
    const dayLogs = weeklyLogs.filter(l => l.date === date);
    return habits.length > 0 ? (dayLogs.length / habits.length) * 100 : 0;
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Rules & Leveling Info */}
      <section className="glass-card p-4 bg-white/80 border-t-4 border-t-natural-purple-text overflow-hidden relative">
        <div className="absolute top-[-10px] right-[-10px] opacity-10 text-natural-purple-text -rotate-12">
          <Award size={80} />
        </div>
        <h3 className="text-[10px] font-bold text-natural-purple-text uppercase tracking-widest mb-3 flex items-center gap-2">
          <Info size={12} /> Guide: Level & Streak
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-natural-text uppercase tracking-tight">Leveling Up</p>
            <p className="text-[8px] text-natural-text/60 leading-relaxed italic">
              Setiap 100 EXP anda naik Level. <br />
              Easy: 5 EXP | Med: 15 EXP | Hard: 30 EXP
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-natural-text uppercase tracking-tight">Maintaining Streak</p>
            <p className="text-[8px] text-natural-text/60 leading-relaxed italic">
              Selesaikan habit setiap hari. Bolong 1 hari = Streak Kembali ke 0.
            </p>
          </div>
        </div>
      </section>

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-display font-semibold text-natural-text italic leading-none mb-2">Balanced Habits</h2>
          <p className="text-[10px] text-natural-purple-text font-bold uppercase tracking-widest">Growth without pressure</p>
        </div>
        <button 
          onClick={() => { if(showAdd) resetForm(); else setShowAdd(true); }}
          className={`p-4 rounded-3xl shadow-xl transition-all ${showAdd ? 'bg-natural-bg text-natural-text rotate-45' : 'bg-natural-teal-text text-white hover:scale-105'}`}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Energy Level Context */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-5 bg-white border-l-4 border-l-natural-teal-text"
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl ${energyLevel === 'low' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
              <TrendingUp size={18} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-natural-text uppercase tracking-tight mb-1">Energy Insight</h4>
              <p className="text-[10px] text-natural-text/60 leading-relaxed">
                {energyLevel === 'low' 
                  ? "Energy levels feel a bit low. It's okay to skip 'Hard' habits today. Focus on 'Easy' mental health wins." 
                  : "You're in a good headspace! Great time to tackle a 'Hard' productivity goal today."}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-5 bg-white border-l-4 border-l-natural-purple-text"
        >
          <h4 className="text-[10px] font-bold text-natural-purple-text uppercase tracking-widest mb-3">Weekly Progress</h4>
          <div className="flex items-end justify-between h-10 gap-1 px-1">
            {weeklyCompletionRate.map((rate, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-natural-bg rounded-full h-full relative overflow-hidden flex flex-col justify-end">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${rate}%` }}
                    className="w-full bg-natural-purple-text/40 rounded-full"
                  />
                </div>
                <span className="text-[6px] font-bold text-natural-text/40 uppercase">{format(subDays(new Date(), 6-i), 'EEE')}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-8 bg-white space-y-6 border-2 border-natural-teal-accent">
              <h3 className="font-display text-xl text-natural-text">{editingHabit ? 'Edit Habit' : 'New Habit'}</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-natural-purple-text uppercase tracking-widest">Habit Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Minum Air..."
                    className="w-full p-4 bg-natural-bg rounded-2xl border-none focus:ring-2 focus:ring-natural-teal-accent transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-natural-purple-text uppercase tracking-widest">Category</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full p-4 bg-natural-bg rounded-2xl border-none focus:ring-2 focus:ring-natural-teal-accent text-xs font-bold appearance-none"
                    >
                      {Object.entries(categories).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-natural-purple-text uppercase tracking-widest">Difficulty</label>
                    <select 
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="w-full p-4 bg-natural-bg rounded-2xl border-none focus:ring-2 focus:ring-natural-teal-accent text-xs font-bold appearance-none"
                    >
                      {Object.entries(difficulties).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-natural-purple-text uppercase tracking-widest">Why is this good for you?</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Small note to remind yourself..."
                    className="w-full p-4 bg-natural-bg rounded-2xl border-none focus:ring-2 focus:ring-natural-teal-accent text-xs font-medium resize-none h-20"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={resetForm} className="flex-1 py-4 bg-natural-bg text-natural-text font-bold rounded-2xl uppercase text-[10px] tracking-widest">Cancel</button>
                <button onClick={saveHabit} className="flex-[2] py-4 bg-natural-teal-text text-white font-bold rounded-2xl shadow-xl uppercase text-[10px] tracking-widest">
                  {editingHabit ? 'Update' : 'Create'} Habit
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Habit Groups by Category */}
      <div className="space-y-12">
        <div className="glass-card p-4 bg-white/50 border-dashed border-2 border-natural-teal-accent/30">
          <p className="text-[10px] text-center text-natural-text/60 italic leading-relaxed">
            🌿 Habits ini adalah template seimbang untukmu. <br />
            Kamu bisa <span className="font-bold">mengedit, menghapus, atau menambah</span> habit sendiri secara detail sesuai kebutuhanmu.
          </p>
          <div className="mt-2 pt-2 border-t border-natural-teal-accent/10 flex items-center justify-center gap-2 text-[8px] text-natural-purple-text font-bold uppercase tracking-widest">
            <Sparkles size={10} /> Progress tercatat otomatis & Reset setiap hari
          </div>
        </div>

        {Object.entries(categories).map(([key, cat]) => {
          const catHabits = habits.filter(h => h.category === key);
          if (catHabits.length === 0) return null;

          return (
            <div key={key} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 ${cat.bg} ${cat.color} rounded-xl flex items-center justify-center`}>
                  <cat.icon size={16} />
                </div>
                <h3 className="text-xs font-bold text-natural-text uppercase tracking-widest">{cat.label}</h3>
              </div>

              <div className="grid gap-4">
                {catHabits.map(habit => {
                  const isDone = logs.some(l => l.habitId === habit.id);
                  const diff = difficulties[habit.difficulty];
                  
                  return (
                    <motion.div
                      layout
                      key={habit.id}
                      className={`glass-card p-4 transition-all group ${isDone ? 'bg-natural-teal/20 border-transparent opacity-80' : 'bg-white'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => toggleHabit(habit)}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                              isDone ? 'bg-natural-teal-text text-white scale-110 shadow-sm' : 'bg-natural-bg text-natural-text/40 hover:bg-natural-teal-accent/20'
                            }`}
                          >
                            {isDone ? <Check strokeWidth={4} /> : <div className="w-4 h-4 border-2 border-natural-border rounded-full" />}
                          </button>
                          
                          <div>
                            <h4 className={`text-sm font-bold transition-all ${isDone ? 'text-natural-teal-text line-through' : 'text-natural-text'}`}>
                              {habit.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[8px] font-black uppercase tracking-tighter ${diff.color}`}>{habit.difficulty}</span>
                              <span className="text-[8px] text-natural-text/30 uppercase font-black">•</span>
                              <span className="text-[8px] text-natural-text/30 uppercase font-black">+{diff.exp} EXP</span>
                              {habit.streak > 0 && (
                                <>
                                  <span className="text-[8px] text-natural-text/30 uppercase font-black">•</span>
                                  <div className="flex items-center gap-0.5 text-rose-500 font-bold text-[8px] animate-pulse">
                                    <Flame size={8} fill="currentColor" /> {habit.streak} DAY STREAK
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(habit)} className="p-2 text-natural-text/30 hover:text-natural-teal-text hover:bg-natural-teal-accent/20 rounded-xl">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => deleteHabit(habit.id!)} className="p-2 text-natural-text/30 hover:text-rose-500 hover:bg-rose-50 rounded-xl">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {habit.description && !isDone && (
                        <div className="mt-3 pl-16">
                          <p className="text-[10px] text-natural-text/40 leading-relaxed font-medium italic">
                            "{habit.description}"
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggestion Section */}
      {habits.length < 5 && (
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-natural-purple-text uppercase tracking-widest pl-1">Suggested Balanced Habits</h3>
          <div className="flex flex-col gap-3">
            {balancedTemplates.map((t, i) => (
              <button
                key={i}
                onClick={() => {
                  setName(t.name);
                  setCategory(t.category as any);
                  setDifficulty(t.difficulty as any);
                  setDescription(t.description);
                  setShowAdd(true);
                }}
                className="glass-card p-4 bg-white/50 border-dashed border-2 flex items-center justify-between hover:border-natural-teal-accent hover:bg-white transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-natural-text">{t.name}</p>
                    <p className="text-[8px] text-natural-text/40 uppercase font-bold tracking-tight">{t.category} • {t.difficulty}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-natural-text/20" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

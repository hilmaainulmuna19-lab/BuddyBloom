import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Utensils, Star, Trophy, Sparkles, Plus as PlusIcon, Flame, Zap, Heart, Brain, Moon, Info, Sun, Music, List, Sparkle } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, where, addDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { UserProfile, Journal, Habit, HabitLog } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';
import { format } from 'date-fns';

interface DashboardProps {
  profile: UserProfile | null;
  user: User;
}

export default function Dashboard({ profile, user }: DashboardProps) {
  const [quote, setQuote] = useState(profile?.quoteType === 'custom' ? (profile?.customQuote || profile?.dailyQuote) : (profile?.dailyQuote || "Semangat hari ini, Kawan! ✨"));
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [todayJournal, setTodayJournal] = useState<Journal | null>(null);
  const [moodAnalysis, setMoodAnalysis] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Pagi';
    if (hour < 17) return 'Siang';
    if (hour < 20) return 'Sore';
    return 'Malam';
  };

  useEffect(() => {
    // Fetch daily quote from API if AI type
    if (!profile?.quoteType || profile?.quoteType === 'ai') {
      fetch('/api/daily-insight')
        .then(res => res.json())
        .then(data => {
          if (data.quote) setQuote(data.quote);
        })
        .catch(() => {});
    }

    // Fetch Real Leaderboard
    const leaderboardPath = 'user_profiles';
    const q = query(collection(db, leaderboardPath), orderBy('level', 'desc'), orderBy('exp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result: UserProfile[] = [];
      snapshot.forEach((doc) => {
        result.push(doc.data() as UserProfile);
      });
      setLeaderboard(result);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, leaderboardPath);
    });

    // Fetch Todays Mood/Journal
    const journalsPath = 'journals';
    const qJournal = query(collection(db, journalsPath), where('userId', '==', user.uid), where('date', '==', today));
    const unsubJournal = onSnapshot(qJournal, (snapshot) => {
      if (!snapshot.empty) {
        setTodayJournal({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Journal);
      } else {
        setTodayJournal(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, journalsPath);
    });

    // Fetch Habits for Quick Actions
    const habitsPath = 'habits';
    const qHabits = query(collection(db, habitsPath), where('userId', '==', user.uid), limit(4));
    const unsubHabits = onSnapshot(qHabits, (snapshot) => {
      setHabits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit)));
    });

    const logsPath = 'habit_logs';
    const qLogs = query(collection(db, logsPath), where('userId', '==', user.uid), where('date', '==', today));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HabitLog)));
    });

    return () => {
      unsubscribe();
      unsubJournal();
      unsubHabits();
      unsubLogs();
    };
  }, []);

  const runMoodAnalysis = async () => {
    setAnalyzing(true);
    try {
      const journalsPath = 'journals';
      const q = query(collection(db, journalsPath), where('userId', '==', user.uid), orderBy('date', 'desc'), limit(30));
      const snap = await getDocs(q);
      const journals = snap.docs.map(d => d.data());
      
      const res = await fetch('/api/mood-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journals })
      });
      const data = await res.json();
      setMoodAnalysis(data.analysis || "Belum ada analisis tersedia.");
    } catch (error) {
      setMoodAnalysis("Gagal melakukan analisis mood.");
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleHabit = async (habit: Habit) => {
    const existingLog = logs.find(l => l.habitId === habit.id);
    const logsPath = 'habit_logs';
    try {
      if (existingLog) {
        await deleteDoc(doc(db, logsPath, existingLog.id!));
      } else {
        await addDoc(collection(db, logsPath), {
          habitId: habit.id,
          userId: user.uid,
          date: today,
          completed: true,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {}
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Mascot */}
      <section className="relative glass-card p-8 overflow-hidden bg-white soft-gradient-blue border-none shadow-xl">
        <div className="relative z-10 flex flex-col items-center text-center">
          <h1 className="text-xs font-semibold text-natural-purple-text uppercase tracking-widest mb-4 font-display">
            Selamat {getGreeting()}, {profile?.displayName?.split(' ')[0]}! ✨
          </h1>
          <p className="text-2xl font-display font-semibold text-natural-text max-w-[95%] leading-tight italic">
            {quote.startsWith('"') ? quote : `"${quote}"`}
          </p>
          <div className="mt-6 flex gap-1">
             <div className="w-1 h-1 rounded-full bg-natural-purple-text" />
             <div className="w-1 h-1 rounded-full bg-natural-teal-text" />
             <div className="w-1 h-1 rounded-full bg-natural-pink-text" />
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={40} className="text-natural-pink-text" /></div>
        <div className="absolute bottom-0 left-0 p-4 opacity-10"><Sparkles size={30} className="text-natural-teal-text" /></div>
      </section>

      {/* Today's Mood Preview */}
      <section className="glass-card p-6 bg-white doft-shadow">
        <h3 className="text-xs font-bold text-natural-purple-text mb-4 uppercase tracking-widest flex items-center gap-2">
          Suasana Hati ✨
        </h3>
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-natural-bg rounded-3xl flex items-center justify-center text-4xl shadow-inner mascot-float">
            {todayJournal?.mood === 'happy' && '😊'}
            {todayJournal?.mood === 'sad' && '😢'}
            {todayJournal?.mood === 'flat' && '😐'}
            {todayJournal?.mood === 'angry' && '😠'}
            {todayJournal?.mood === 'love' && '😍'}
            {!todayJournal && '❓'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-sans italic text-natural-text leading-tight mb-2">
              {todayJournal ? (
                `"${todayJournal.content.slice(0, 80)}${todayJournal.content.length > 80 ? '...' : ''}"`
              ) : (
                "Bagaimana harimu sejauh ini? Bagikan ceritamu denganku..."
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[10px] font-semibold text-natural-purple-text uppercase tracking-widest">
                {todayJournal ? `Mood: ${todayJournal.mood}` : "Belum menulis jurnal hari ini"}
              </p>
              {todayJournal?.song && (
                <div className="flex items-center gap-1.5 bg-natural-teal-accent/20 px-2 py-0.5 rounded-full">
                  <Music size={10} className="text-natural-teal-text" />
                  <span className="text-[9px] font-bold text-natural-teal-text italic truncate max-w-[100px]">"{todayJournal.song}"</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Insight Trigger */}
        <div className="mt-6 pt-6 border-t border-natural-border/30">
          <button 
            onClick={runMoodAnalysis}
            disabled={analyzing}
            className="w-full py-3 bg-natural-bg hover:bg-natural-purple-text hover:text-white transition-all rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-widest disabled:opacity-50"
          >
            <Sparkle size={14} className={analyzing ? "animate-spin" : ""} />
            {analyzing ? "Menganalisis Emosimu..." : "Analisis Mood Bulanan (AI)"}
          </button>
          
          <AnimatePresence>
            {moodAnalysis && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 bg-natural-bg/50 rounded-2xl border border-natural-purple-text/10"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-xl text-natural-purple-text">
                    <Brain size={14} />
                  </div>
                  <p className="text-[10px] leading-relaxed text-natural-text font-medium italic">
                    "{moodAnalysis}"
                  </p>
                </div>
                <button onClick={() => setMoodAnalysis("")} className="mt-2 text-[8px] font-bold text-natural-purple-text/40 uppercase tracking-widest w-full text-right p-1">Tutup</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section className="glass-card p-6 bg-white doft-shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-natural-purple-text uppercase tracking-widest flex items-center gap-2">
            Leaderboard 🏆
          </h3>
          <div className="flex items-center gap-1 text-[8px] text-natural-teal-text font-bold uppercase bg-natural-teal-accent/20 px-2 py-1 rounded-full">
            <Sparkles size={8} /> Data Publik
          </div>
        </div>
        <div className="space-y-3">
          {leaderboard.length > 0 ? (
            leaderboard.map((u, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={u.uid} 
                className={`flex items-center justify-between p-3 rounded-2xl transition-all ${u.uid === user.uid ? 'bg-natural-text text-white shadow-lg scale-[1.02]' : 'bg-natural-bg/50'}`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`font-bold w-4 text-[10px] ${u.uid === user.uid ? 'text-white/50' : 'text-natural-text/40'}`}>{i+1}</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${u.uid === user.uid ? 'bg-white text-natural-text' : 'bg-white text-natural-text border border-natural-border'}`}>
                    {(u.displayName || 'K')[0].toUpperCase()}
                  </div>
                  <span className={`text-xs ${u.uid === user.uid ? 'font-bold' : 'font-medium'}`}>
                    {u.displayName || 'Kawan'} {u.uid === user.uid && "(Me)"}
                  </span>
                </div>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${u.uid === user.uid ? 'bg-white/20 text-white' : 'bg-white text-natural-text shadow-sm'}`}>Lv. {u.level}</span>
              </motion.div>
            ))
          ) : (
            <div className="py-4 text-center text-[10px] italic text-natural-text/40">Gathering fellow explorers...</div>
          )}
        </div>
        <p className="mt-4 text-[8px] text-center text-natural-text/40 uppercase font-bold tracking-widest leading-relaxed">
          Hanya namamu dan progress level yang terlihat oleh publik. 
          <br />Jurnal, keuangan, dan tugasmu tetap rahasia pribadi. 🔒
        </p>
      </section>

      {/* Badges Section */}
      <section className="glass-card p-6 bg-white doft-shadow">
        <h3 className="text-xs font-bold text-natural-purple-text mb-4 uppercase tracking-widest flex items-center gap-2">
          Badges & Achievements 🎖️
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { icon: "💧", label: "Hydrated", status: habits.some(h => h.name.includes('Air') && logs.some(l => l.habitId === h.id)) ? 'unlocked' : 'locked' },
            { icon: "🧘", label: "Peaceful", status: habits.some(h => h.category === 'spiritual' && logs.some(l => l.habitId === h.id)) ? 'unlocked' : 'locked' },
            { icon: "🔥", label: "Streaker", status: habits.some(h => h.streak >= 3) ? 'unlocked' : 'locked' },
            { icon: "💰", label: "Frugal", status: (profile?.level || 1) >= 2 ? 'unlocked' : 'locked' },
            { icon: "🧠", label: "Mindful", status: todayJournal ? 'unlocked' : 'locked' },
            { icon: "👑", label: "Elite", status: (profile?.level || 1) >= 5 ? 'unlocked' : 'locked' },
          ].map((b, i) => (
            <div key={i} className="flex flex-col items-center min-w-[70px]">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm mb-2 transition-all ${b.status === 'unlocked' ? 'bg-natural-yellow border-2 border-white' : 'bg-natural-bg grayscale opacity-20'}`}>
                {b.icon}
              </div>
              <span className={`text-[9px] font-bold text-center ${b.status === 'unlocked' ? 'text-natural-text' : 'text-natural-text/40'}`}>{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Habits Quick Tracker */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-natural-purple-text uppercase tracking-widest flex items-center gap-2">
            Quick Habit Actions ⚡
          </h3>
          <span className="text-[8px] font-bold text-natural-text/40 uppercase">All Categories</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { id: 'morning', label: 'Morning', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50' },
            { id: 'spiritual', label: 'Soul', icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-50' },
            { id: 'productivity', label: 'Focus', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50' },
            { id: 'health', label: 'Body', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
            { id: 'mental', label: 'Heal', icon: Brain, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { id: 'night', label: 'Night', icon: Moon, color: 'text-slate-500', bg: 'bg-slate-50' },
          ].map((cat) => {
            const habit = habits.find(h => h.category === cat.id);
            const isDone = habit ? logs.some(l => l.habitId === habit.id) : false;
            
            return (
              <motion.div 
                key={cat.id}
                whileHover={{ scale: 1.02 }} 
                onClick={() => habit && toggleHabit(habit)}
                className={`glass-card p-3 border-none shadow-sm cursor-pointer transition-all flex flex-col justify-between min-h-[90px] ${!habit ? 'opacity-30' : isDone ? 'opacity-60 bg-gray-50' : 'bg-white shadow-md'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-lg ${cat.bg} ${cat.color}`}>
                    <cat.icon size={12} />
                  </div>
                  {isDone && <Check size={10} strokeWidth={4} className="text-natural-teal-text" />}
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-tighter text-natural-text/30 mb-0.5">{cat.label}</p>
                  <p className={`text-[10px] font-bold truncate leading-tight ${isDone ? 'line-through text-natural-text/30' : 'text-natural-text'}`}>
                    {habit ? habit.name : "Unset"}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
        <p className="text-[8px] text-center text-natural-purple-text/40 italic">
          Klik untuk selesaikan. Edit isi habit di tab Habits.
        </p>
      </section>

      {/* Leveling & Stats */}
      <section className="glass-card p-6 bg-white doft-shadow">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-bold text-natural-purple-text uppercase tracking-widest flex items-center gap-2">
            Progress & Goals
          </h3>
          <div className="flex items-center gap-1 bg-natural-bg px-2 py-1 rounded-lg">
            <Zap className="text-natural-yellow fill-natural-yellow" size={14} />
            <span className="text-[10px] font-bold">{(profile?.exp || 0)} EXP</span>
          </div>
        </div>
        
        <div className="space-y-5">
          <ProgressBar 
            label={`Level ${profile?.level || 1}`} 
            progress={(profile?.exp || 0) % 100} 
            color="bg-natural-purple-text" 
          />
          <div className="flex items-start gap-4 p-4 bg-natural-bg rounded-2xl">
            <div className="p-2 bg-white rounded-xl text-natural-purple-text">
              <Info size={14} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-natural-purple-text uppercase tracking-widest mb-1">How to Level Up?</p>
              <p className="text-[8px] text-natural-text/60 leading-relaxed italic">
                Selesaikan habit harianmu. Semakin sulit habitnya (Medium/Hard), semakin besar EXP yang didapat!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Check({ size, strokeWidth }: any) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ProgressBar({ label, progress, color }: any) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-3 w-full bg-white rounded-full overflow-hidden shadow-inner">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, delay: 0.5 }}
          className={`h-full ${color}`} 
        />
      </div>
    </div>
  );
}

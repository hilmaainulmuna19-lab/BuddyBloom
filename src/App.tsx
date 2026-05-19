import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Calendar, 
  Plus, 
  MessageCircle, 
  BarChart2, 
  User as UserIcon,
  LogOut,
  Droplets,
  Utensils,
  TrendingDown,
  Sparkles,
  Trophy
} from 'lucide-react';
import { auth, db, signInWithGoogle } from './lib/firebase';
import { UserProfile, Habit, Transaction, Task } from './types';
import MascoChat from './components/MascoChat';
import HabitTracker from './components/HabitTracker';
import FinancialTracker from './components/FinancialTracker';
import TaskList from './components/TaskList';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import Journaling from './components/Journaling';
import ProfileSettings from './components/ProfileSettings';
import { handleFirestoreError, OperationType } from './lib/firestore-error-handler';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
        if (u) {
          // Fetch or Create Profile
          const profilePath = `user_profiles/${u.uid}`;
          const profileRef = doc(db, 'user_profiles', u.uid);
          try {
            const profileSnap = await getDoc(profileRef);
            
            if (profileSnap.exists()) {
              setProfile(profileSnap.data() as UserProfile);
            } else {
              const newProfile: UserProfile = {
                uid: u.uid,
                displayName: u.displayName || 'Kawan Baru',
                level: 1,
                exp: 0,
                characterId: 'default',
                waterReminder: true,
                mealReminder: true,
                dailyQuote: 'Semangat hari ini, Kawan! ✨',
                theme: 'peach',
                updatedAt: new Date().toISOString()
              };
              await setDoc(profileRef, newProfile);
              setProfile(newProfile);
              setShowOnboarding(true);
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, profilePath);
          }

          // Check local storage for onboarding
        const hasOnboarded = localStorage.getItem('onboarding_v1');
        if (!hasOnboarded) {
          setShowOnboarding(true);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-natural-bg">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-6xl"
        >
          🐻‍❄️
        </motion.div>
        <p className="mt-4 font-cute text-xl text-natural-purple-text">Menyiapkan duniamu...</p>
      </div>
    );
  }

  const completeOnboarding = async (name: string) => {
    if (profile) {
      const profileRef = doc(db, 'user_profiles', profile.uid);
      await setDoc(profileRef, { ...profile, displayName: name }, { merge: true });
      setProfile({ ...profile, displayName: name });
    }
    localStorage.setItem('onboarding_v1', 'true');
    setShowOnboarding(false);
  };

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-natural-pink space-y-8 p-6">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <h1 className="text-5xl font-cute text-natural-text mb-2">KawanKecil</h1>
          <p className="text-natural-pink-text font-medium">Asisten Setia untuk Waktu & Keuanganmu ✨</p>
        </motion.div>
        
        <div className="relative">
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="text-9xl mascot-float"
          >
            🐻‍❄️
          </motion.div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/5 rounded-full blur-md" />
        </div>

        <button
          onClick={signInWithGoogle}
          className="px-8 py-4 bg-white text-natural-text font-bold rounded-full shadow-lg hover:scale-105 transition-transform flex items-center space-x-3 border-2 border-natural-border"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
          <span>Mulai Bareng Kawan</span>
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Dashboard profile={profile} user={user} />;
      case 'journal': return <Journaling user={user} />;
      case 'habits': return <HabitTracker user={user} profile={profile} setProfile={setProfile} />;
      case 'money': return <FinancialTracker user={user} profile={profile} setProfile={setProfile} />;
      case 'tasks': return <TaskList user={user} profile={profile} setProfile={setProfile} />;
      case 'chat': return <MascoChat user={user} profile={profile} />;
      case 'profile': return <ProfileSettings user={user} profile={profile} setProfile={setProfile} />;
      default: return <Dashboard profile={profile} user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-natural-bg pb-24 text-natural-text font-creative">
      <AnimatePresence>
        {showOnboarding && (
          <Onboarding 
            onComplete={completeOnboarding} 
            initialName={profile?.displayName}
          />
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="p-6 flex justify-between items-center bg-white border-b border-natural-border sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-natural-teal rounded-full flex items-center justify-center shadow-sm relative">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xl">
              🐻‍❄️
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-natural-teal-accent border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
              LV.{profile?.level}
            </div>
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-natural-text leading-none">
              {profile?.displayName?.split(' ')[0]}
            </h1>
            <p className="text-[10px] text-natural-purple-text font-bold uppercase tracking-[0.2em] mt-1">
              Explorer • LV.{profile?.level}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm ${activeTab === 'profile' ? 'bg-natural-purple-text text-white' : 'bg-natural-teal text-natural-text hover:bg-natural-teal-accent'}`}
        >
          <UserIcon size={18} />
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation */}
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-sm bg-white/90 backdrop-blur-xl border border-natural-border shadow-xl rounded-full p-2 flex justify-around items-center z-50">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Heart size={20} />} label="Home" />
        <NavButton active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} icon={<Sparkles size={20} />} label="Journal" />
        <NavButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} className="bg-natural-text !text-white w-14 h-14 rounded-full shadow-lg -mt-10" icon={<MessageCircle size={24} />} label="" />
        <NavButton active={activeTab === 'money'} onClick={() => setActiveTab('money')} icon={<BarChart2 size={20} />} label="Money" />
        <NavButton active={activeTab === 'habits'} onClick={() => setActiveTab('habits')} icon={<Calendar size={20} />} label="Habits" />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, className = '' }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center px-4 py-2 rounded-full transition-all duration-300 ${
        active ? 'soft-gradient-blue text-natural-text scale-105 shadow-sm' : 'text-natural-purple-text hover:bg-natural-bg'
      } ${className}`}
    >
      {icon}
      {label && <span className="text-[10px] mt-1 font-bold tracking-tight">{label}</span>}
    </button>
  );
}

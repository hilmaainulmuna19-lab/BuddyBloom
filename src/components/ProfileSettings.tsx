import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, Quote, Edit, Check, List, Sparkles, LogOut, ChevronRight } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile } from '../types';

interface ProfileSettingsProps {
  user: any;
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
}

const curatedQuotes = [
  "Believe in yourself and all that you are.",
  "The only way to do great work is to love what you do.",
  "Don't watch the clock; do what it does. Keep going.",
  "Your time is limited, don't waste it living someone else's life.",
  "Everything you've ever wanted is on the other side of fear.",
  "Hardships often prepare ordinary people for an extraordinary destiny.",
  "Quality is not an act, it is a habit."
];

export default function ProfileSettings({ user, profile, setProfile }: ProfileSettingsProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(profile?.displayName || '');
  const [tempQuote, setTempQuote] = useState(profile?.customQuote || '');
  const [quoteType, setQuoteType] = useState<'ai' | 'custom'>(profile?.quoteType || 'ai');
  const [showCurated, setShowCurated] = useState(false);

  const saveProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    try {
      const profileRef = doc(db, 'user_profiles', profile.uid);
      await updateDoc(profileRef, updates);
      setProfile({ ...profile, ...updates });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateName = () => {
    saveProfile({ displayName: tempName });
    setIsEditingName(false);
  };

  const selectCurated = (q: string) => {
    setTempQuote(q);
    setQuoteType('custom');
    saveProfile({ customQuote: q, quoteType: 'custom' });
    setShowCurated(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-natural-teal rounded-full flex items-center justify-center text-3xl shadow-md border-4 border-white">
          🐻‍❄️
        </div>
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={tempName} 
                onChange={(e) => setTempName(e.target.value)}
                className="bg-natural-bg p-2 rounded-xl text-sm font-bold border-none focus:ring-2 focus:ring-natural-teal-accent"
              />
              <button onClick={handleUpdateName} className="p-2 bg-natural-teal text-white rounded-xl shadow-sm">
                <Check size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-natural-text">{profile?.displayName}</h2>
              <button onClick={() => setIsEditingName(true)} className="text-natural-text/30 hover:text-natural-purple-text">
                <Edit size={14} />
              </button>
            </div>
          )}
          <p className="text-[10px] text-natural-purple-text font-bold uppercase tracking-widest mt-1">Level {profile?.level} Explorer</p>
        </div>
      </div>

      <div className="glass-card p-6 bg-white space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Quote size={18} className="text-natural-purple-text" />
          <h3 className="text-xs font-bold text-natural-purple-text uppercase tracking-widest">Quote Preferences</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => { setQuoteType('ai'); saveProfile({ quoteType: 'ai' }); }}
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${quoteType === 'ai' ? 'border-natural-purple-text bg-natural-purple-text/5' : 'border-natural-bg'}`}
          >
            <Sparkles size={18} className={quoteType === 'ai' ? 'text-natural-purple-text' : 'text-natural-text/30'} />
            <span className={`text-[10px] font-bold uppercase transition-colors ${quoteType === 'ai' ? 'text-natural-purple-text' : 'text-natural-text/40'}`}>AI Generated</span>
          </button>
          <button 
            onClick={() => { setQuoteType('custom'); saveProfile({ quoteType: 'custom' }); }}
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${quoteType === 'custom' ? 'border-natural-teal-text bg-natural-teal-text/5' : 'border-natural-bg'}`}
          >
            <Edit size={18} className={quoteType === 'custom' ? 'text-natural-teal-text' : 'text-natural-text/30'} />
            <span className={`text-[10px] font-bold uppercase transition-colors ${quoteType === 'custom' ? 'text-natural-teal-text' : 'text-natural-text/40'}`}>Custom Quote</span>
          </button>
        </div>

        {quoteType === 'custom' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-natural-text/40 uppercase tracking-widest ml-1">Your Daily Quote</label>
              <div className="relative">
                <textarea 
                  value={tempQuote}
                  onChange={(e) => setTempQuote(e.target.value)}
                  onBlur={() => saveProfile({ customQuote: tempQuote })}
                  placeholder="Type your own inspiration..."
                  className="w-full p-4 bg-natural-bg rounded-2xl border-none focus:ring-2 focus:ring-natural-teal-accent text-xs font-medium italic min-h-[80px]"
                />
              </div>
            </div>

            <button 
              onClick={() => setShowCurated(!showCurated)}
              className="flex items-center justify-between w-full p-4 bg-natural-bg rounded-2xl text-[10px] font-bold uppercase tracking-widest text-natural-text"
            >
              <div className="flex items-center gap-2">
                <List size={14} />
                <span>Choose from Curated List</span>
              </div>
              <ChevronRight size={14} className={`transition-transform ${showCurated ? 'rotate-90' : ''}`} />
            </button>

            {showCurated && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-2"
              >
                {curatedQuotes.map((q, i) => (
                  <button 
                    key={i}
                    onClick={() => selectCurated(q)}
                    className="p-3 bg-natural-bg/50 hover:bg-natural-teal-accent/20 rounded-xl text-[10px] text-left italic transition-colors border border-transparent hover:border-natural-teal-accent/30"
                  >
                    "{q}"
                  </button>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      <div className="space-y-4">
        <button 
          onClick={() => auth.signOut()}
          className="w-full p-5 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs border border-rose-100 shadow-sm"
        >
          <LogOut size={16} />
          Sign Out / Exit
        </button>
        <p className="text-[8px] text-center text-natural-text/30 font-bold uppercase tracking-[0.3em]">
          KawanKecil v1.2 • Terus Berproses
        </p>
      </div>
    </div>
  );
}

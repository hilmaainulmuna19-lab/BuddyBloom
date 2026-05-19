import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smile, 
  Frown, 
  Meh, 
  Angry, 
  Heart, 
  Plus, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  BookOpen,
  Music,
  Sparkles
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { Journal } from '../types';
import { format, isSameDay, parseISO, subDays } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';

interface JournalingProps {
  user: User;
}

const moodEmojis = {
  happy: { emoji: '😊', icon: Smile, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  sad: { emoji: '😢', icon: Frown, color: 'text-blue-500', bg: 'bg-blue-50' },
  flat: { emoji: '😐', icon: Meh, color: 'text-gray-500', bg: 'bg-gray-50' },
  angry: { emoji: '😠', icon: Angry, color: 'text-red-500', bg: 'bg-red-50' },
  love: { emoji: '😍', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
};

export default function Journaling({ user }: JournalingProps) {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [content, setContent] = useState('');
  const [song, setSong] = useState('');
  const [aiReflection, setAiReflection] = useState('');
  const [aiAffirmation, setAiAffirmation] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedMood, setSelectedMood] = useState<keyof typeof moodEmojis>('happy');
  const [isWriting, setIsWriting] = useState(false);
  const [viewingDate, setViewingDate] = useState(new Date());

  const today = format(new Date(), 'yyyy-MM-dd');
  const viewingDateStr = format(viewingDate, 'yyyy-MM-dd');

  useEffect(() => {
    const journalsPath = 'journals';
    const q = query(
      collection(db, journalsPath),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJournals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Journal)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, journalsPath);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const currentJournal = journals.find(j => j.date === viewingDateStr);

  const getAiInsight = async () => {
    if (!content.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/journal-buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mood: selectedMood })
      });
      const data = await res.json();
      if (data.reflection) {
        setAiReflection(data.reflection);
        setAiAffirmation(data.affirmation);
        if (!song) setSong(data.song_suggestion);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveJournal = async () => {
    if (!content.trim()) return;
    const journalsPath = 'journals';
    
    try {
      const journalData = {
        userId: user.uid,
        content,
        mood: selectedMood,
        song: song.trim(),
        aiReflection,
        aiAffirmation,
        date: viewingDateStr,
        createdAt: new Date().toISOString()
      };

      if (currentJournal) {
        await updateDoc(doc(db, journalsPath, currentJournal.id!), journalData);
      } else {
        await addDoc(collection(db, journalsPath), journalData);
      }
      setIsWriting(false);
      setContent('');
      setSong('');
      setAiReflection('');
      setAiAffirmation('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, journalsPath);
    }
  };

  const startEditing = () => {
    if (currentJournal) {
      setContent(currentJournal.content);
      setSelectedMood(currentJournal.mood);
      setSong(currentJournal.song || '');
      setAiReflection(currentJournal.aiReflection || '');
      setAiAffirmation(currentJournal.aiAffirmation || '');
    } else {
      setContent('');
      setSelectedMood('happy');
      setSong('');
      setAiReflection('');
      setAiAffirmation('');
    }
    setIsWriting(true);
  };

  const changeDate = (days: number) => {
    setViewingDate(prev => subDays(prev, -days));
    setIsWriting(false);
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xs font-semibold text-natural-text uppercase tracking-widest leading-none mb-1">Daily Journal</h2>
          <p className="text-[10px] text-natural-teal-text font-bold uppercase tracking-widest leading-none">Capture your thoughts</p>
        </div>
        <div className="p-3 bg-white border border-natural-border rounded-full shadow-sm">
          <BookOpen className="text-natural-teal-text" size={20} />
        </div>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-white p-4 rounded-[24px] border border-natural-border shadow-sm">
        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-natural-bg rounded-full transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold uppercase tracking-widest text-natural-text">
            {isSameDay(viewingDate, new Date()) ? 'Today' : format(viewingDate, 'MMMM do')}
          </span>
          <span className="text-[10px] text-natural-purple-text font-medium">{format(viewingDate, 'EEEE')}</span>
        </div>
        <button 
          onClick={() => changeDate(1)} 
          disabled={isSameDay(viewingDate, new Date())}
          className="p-2 hover:bg-natural-bg rounded-full transition-colors disabled:opacity-20"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!isWriting ? (
          <motion.div
            key="display"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {currentJournal ? (
              <div className="glass-card p-8 bg-white space-y-6 min-h-[300px] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-natural-bg/50 p-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{moodEmojis[currentJournal.mood].emoji}</span>
                      <div>
                        <p className="text-[8px] font-bold text-natural-purple-text uppercase tracking-widest">Current Mood</p>
                        <p className="text-xs font-bold text-natural-text capitalize">{currentJournal.mood}</p>
                      </div>
                    </div>
                    {currentJournal.song && (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-natural-border/30">
                        <Music size={12} className="text-natural-teal-text" />
                        <p className="text-[10px] font-bold text-natural-text italic">"{currentJournal.song}"</p>
                      </div>
                    )}
                  </div>
                  <p className="text-lg font-sans leading-relaxed text-natural-text whitespace-pre-wrap italic">
                    "{currentJournal.content}"
                  </p>
                  
                  {(currentJournal.aiReflection || currentJournal.aiAffirmation) && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-natural-bg/50 p-6 rounded-[32px] border border-natural-teal-accent/20 space-y-4"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-natural-teal-text" />
                        <h4 className="text-[10px] font-bold text-natural-teal-text uppercase tracking-widest">Kawan's Reflection</h4>
                      </div>
                      {currentJournal.aiReflection && <p className="text-xs text-natural-text leading-relaxed italic">"{currentJournal.aiReflection}"</p>}
                      {currentJournal.aiAffirmation && (
                        <div className="pt-2 border-t border-natural-teal-accent/10">
                          <p className="text-[10px] text-natural-purple-text font-bold uppercase tracking-[0.2em] mb-1">Affirmation</p>
                          <p className="text-xs font-bold text-natural-text">{currentJournal.aiAffirmation}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
                <button 
                  onClick={startEditing}
                  className="w-full py-3 border-2 border-dashed border-natural-border text-natural-text/40 rounded-2xl text-[10px] uppercase font-bold tracking-widest hover:border-natural-teal-accent hover:text-natural-teal-text transition-all"
                >
                  Edit Entry
                </button>
              </div>
            ) : (
              <div className="glass-card p-12 bg-white flex flex-col items-center text-center space-y-6 border-dashed border-2 border-natural-border">
                <div className="w-16 h-16 bg-natural-bg rounded-full flex items-center justify-center">
                  <Plus className="text-natural-text/20" />
                </div>
                <div>
                  <p className="text-lg font-display font-semibold italic text-natural-text/40 mb-2">How was your day?</p>
                  <p className="text-[10px] text-natural-text/30 font-semibold uppercase tracking-widest">No entry for this date yet</p>
                </div>
                <button 
                  onClick={startEditing}
                  className="px-8 py-4 bg-natural-teal-text text-white font-semibold rounded-2xl shadow-xl hover:scale-105 transition-transform font-display uppercase text-xs tracking-widest"
                >
                  Write Journal
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="write"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-8 bg-white space-y-8"
          >
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-natural-purple-text uppercase tracking-widest">How are you feeling?</p>
              <div className="flex justify-between gap-2">
                {(Object.entries(moodEmojis) as [keyof typeof moodEmojis, typeof moodEmojis['happy']][]).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedMood(key)}
                    className={`flex-1 aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                      selectedMood === key ? value.bg + ' ring-2 ring-inset ring-' + value.color.split('-')[1] + '-200 scale-105' : 'bg-natural-bg grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                    }`}
                  >
                    <span className="text-2xl">{value.emoji}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-tighter ${selectedMood === key ? value.color : 'text-natural-text'}`}>
                      {key}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-natural-purple-text uppercase tracking-widest">Your Reflections</p>
              <textarea 
                placeholder="Today was a beautiful day because..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[250px] p-6 bg-natural-bg rounded-[32px] border-none focus:ring-2 focus:ring-natural-teal-accent font-sans text-natural-text text-lg leading-relaxed shadow-inner resize-none"
              />
              
              {content.length > 20 && !aiReflection && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={getAiInsight}
                  disabled={isAnalyzing}
                  className="w-full py-3 bg-natural-teal-accent/20 text-natural-teal-text rounded-2xl text-[10px] uppercase font-black tracking-widest flex items-center justify-center gap-2 hover:bg-natural-teal-accent/30 transition-all border border-natural-teal-accent/10"
                >
                  <Sparkles size={14} className={isAnalyzing ? "animate-spin" : ""} />
                  {isAnalyzing ? "Analyzing Vibes..." : "Get AI Reflection & Song"}
                </motion.button>
              )}

              <AnimatePresence>
                {(aiReflection || aiAffirmation) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-natural-teal-accent/10 rounded-[32px] border border-natural-teal-accent/20 space-y-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-natural-teal-text" />
                        <h4 className="text-[10px] font-bold text-natural-teal-text uppercase tracking-widest">Kawan's Thought</h4>
                      </div>
                      <button onClick={() => {setAiReflection(''); setAiAffirmation('');}} className="text-[9px] font-bold text-natural-teal-text/40 uppercase">Clear</button>
                    </div>
                    {aiReflection && <p className="text-xs text-natural-text leading-relaxed italic">"{aiReflection}"</p>}
                    {aiAffirmation && (
                      <div className="pt-2 border-t border-natural-teal-accent/10">
                        <p className="text-[9px] text-natural-purple-text font-bold uppercase tracking-widest mb-1">Affirmation</p>
                        <p className="text-xs font-bold text-natural-text">{aiAffirmation}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-3 relative">
              <p className="text-[10px] font-bold text-natural-purple-text uppercase tracking-widest flex items-center gap-2">
                <Music size={12} /> Song of the Day
              </p>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Seaching for a song that matches your vibe..."
                  value={song}
                  onChange={(e) => setSong(e.target.value)}
                  className="w-full p-4 bg-natural-bg rounded-2xl border-none focus:ring-2 focus:ring-natural-teal-accent text-xs font-medium pl-10"
                />
                <Music className="absolute left-4 top-1/2 -translate-y-1/2 text-natural-text/30" size={14} />
              </div>
              
              {song && !journals.some(j => j.song === song) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {['Lofi Hip Hop', 'Morning Coffee', 'Manifesting', 'Peaceful Piano', 'Midnight City'].filter(s => s.toLowerCase().includes(song.toLowerCase())).map(s => (
                    <button 
                      key={s}
                      onClick={() => setSong(s)}
                      className="text-[9px] bg-white border border-natural-border/30 px-2 py-1 rounded-full text-natural-text/60 hover:bg-natural-teal-accent/10 transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setIsWriting(false)}
                className="flex-1 py-4 bg-natural-bg text-natural-text font-bold rounded-2xl uppercase text-[10px] tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={saveJournal}
                className="flex-[2] py-4 bg-natural-teal-text text-white font-bold rounded-2xl shadow-xl uppercase text-[10px] tracking-widest"
              >
                Save Reflection
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Preview */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-bold text-natural-purple-text uppercase tracking-[0.2em]">Recent Memories</h3>
        <div className="grid grid-cols-1 gap-4">
          {journals.slice(0, 5).map(journal => (
            <motion.div
              layout
              key={journal.id}
              onClick={() => { setViewingDate(parseISO(journal.date)); setIsWriting(false); }}
              className="bg-white p-4 rounded-3xl border border-natural-border flex items-center gap-4 cursor-pointer hover:border-natural-teal-accent group transition-all"
            >
              <div className={`w-12 h-12 ${moodEmojis[journal.mood].bg} rounded-2xl flex items-center justify-center text-xl`}>
                {moodEmojis[journal.mood].emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-natural-purple-text uppercase tracking-widest mb-1">{format(parseISO(journal.date), 'EEE, MMM d')}</p>
                <p className="text-xs text-natural-text truncate font-sans italic">"{journal.content}"</p>
              </div>
              <ChevronRight size={16} className="text-natural-border group-hover:text-natural-teal-accent transition-colors" />
            </motion.div>
          ))}
          {journals.length === 0 && (
            <div className="text-center py-8 text-natural-text/20">
              <p className="text-xs font-sans italic">No past memories yet... start writing today!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

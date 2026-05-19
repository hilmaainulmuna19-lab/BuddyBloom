import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Sparkles, Target, BarChart, Heart } from 'lucide-react';

interface OnboardingProps {
  onComplete: (name: string) => void;
  initialName?: string;
}

export default function Onboarding({ onComplete, initialName }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState(initialName || '');

  const slides = [
    {
      title: "Selamat Datang!",
      desc: "Aku Kawan, asisten personalmu yang siap menemani hari-harimu jadi lebih ceria dan produktif. 🐻‍❄️",
      icon: <Sparkles className="w-12 h-12 text-natural-yellow" />,
      color: "bg-natural-purple"
    },
    {
      title: "Pantau Habits",
      desc: "Bangun kebiasaan baik setiap hari. Setiap ceklis membawamu lebih dekat ke versi terbaikmu! ✨",
      icon: <Heart className="w-12 h-12 text-natural-pink-text" />,
      color: "bg-natural-pink"
    },
    {
      title: "Kelola Keuangan",
      desc: "Catat pengeluaran dan pemasukan dengan mudah. Mari capai tujuan finansialmu bersama-sama. 💰",
      icon: <BarChart className="w-12 h-12 text-natural-teal-text" />,
      color: "bg-natural-teal"
    },
    {
      title: "Selesaikan Task",
      desc: "Prioritaskan apa yang penting. Fokus pada hal-hal yang membuatmu bahagia dan berkembang. 🚀",
      icon: <Target className="w-12 h-12 text-natural-purple-text" />,
      color: "bg-natural-purple"
    },
    {
      title: "Siapa Namamu?",
      desc: "Boleh tau nama panggilan kesukaanmu? Supaya aku bisa menyapamu dengan lebih akrab. 😊",
      icon: <span className="text-4xl">👋</span>,
      color: "bg-natural-bg",
      isInput: true
    }
  ];

  const next = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(nickname || initialName || 'Kawan');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-white flex flex-col"
    >
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-8 w-full max-w-xs mx-auto"
          >
            <div className={`w-24 h-24 ${slides[step].color} rounded-[32px] flex items-center justify-center mx-auto shadow-sm`}>
              {slides[step].icon}
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-display font-semibold text-natural-text leading-tight">
                {slides[step].title}
              </h2>
              <p className="text-base text-natural-text/70 leading-relaxed font-medium">
                {slides[step].desc}
              </p>
              
              {slides[step].isInput && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-4"
                >
                  <input 
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Contoh: Hilman, Ainun..."
                    className="w-full p-4 bg-natural-bg rounded-2xl border-2 border-transparent focus:border-natural-purple-text text-center font-bold text-lg focus:ring-0 transition-all"
                    autoFocus
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-10 flex flex-col items-center space-y-8">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-natural-text' : 'bg-natural-border'}`} 
            />
          ))}
        </div>
        
        <button 
          onClick={next}
          disabled={slides[step].isInput && !nickname.trim()}
          className="w-full h-16 bg-natural-text text-white rounded-[24px] font-display font-semibold text-lg shadow-xl flex items-center justify-center gap-2 group transition-all active:scale-95 disabled:opacity-50"
        >
          {step === slides.length - 1 ? "Mulai Sekarang" : "Selanjutnya"}
          <ChevronRight className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}

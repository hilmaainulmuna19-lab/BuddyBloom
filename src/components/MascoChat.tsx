import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, User as UserIcon, Bot, Heart } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import ReactMarkdown from 'react-markdown';

interface MascoChatProps {
  user: User;
  profile: UserProfile | null;
}

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export default function MascoChat({ user, profile }: MascoChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial greeting
    setMessages([{
      role: 'model',
      parts: [{ text: `Halo {name}! Ada yang mau kamu tanyain ke Kawan hari ini? Boleh soal kesehatan, motivasi, atau gimana cara hemat jajan! Kawan siap bantu ✨`.replace('{name}', profile?.displayName || 'Kawan') }]
    }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      role: 'user',
      parts: [{ text: input }]
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages,
          context: `User Profile:
- Name: ${profile?.displayName}
- Level: ${profile?.level}
- Goals: Management Waktu (Habits/Tasks), Keuangan (Saving/Budgeting), dan Kesejahteraan Mental (Journaling/Mood).
- Role: Kamu adalah Kawan, asisten pribadi berpakaian Polar Bear yang ramah, imut, dan peduli.
- Topics: 
  1. Kesehatan (minum air, istirahat).
  2. Motivasi (quote semangat).
  3. Keuangan (tips hemat).
  4. Journaling: Ajak user untuk bercerita tentang hari mereka di fitur "Journal" dan pilih mood yang sesuai (happy, sad, flat, angry, love).
- Tone: Santai, mendukung, menggunakan emoji imut dan sesekali bertema musim dingin (❄️, 🧊).`
        })
      });
      const data = await res.json();
      
      if (data.response) {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: data.response }]
        }]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] bg-natural-bg glass-card p-0 overflow-hidden border-natural-border shadow-md">
      {/* Chat Header */}
      <div className="p-5 bg-white border-b border-natural-border flex items-center space-x-3">
        <div className="w-10 h-10 bg-natural-teal rounded-xl flex items-center justify-center text-xl shadow-sm mascot-float">
          🐻‍❄️
        </div>
        <div>
          <h3 className="text-sm font-display font-bold text-natural-text uppercase tracking-widest leading-none">Joy Bot</h3>
          <p className="text-[9px] text-natural-teal-text font-bold uppercase tracking-widest flex items-center gap-1 mt-1 opacity-70 leading-none">
            <span className="w-1.5 h-1.5 bg-natural-teal-accent rounded-full animate-pulse" />
            Ready to help
          </p>
        </div>
      </div>

      {/* Messages View */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-[#F8FAFD]"
      >
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-natural-pink text-natural-pink-text rounded-tr-none border border-natural-pink-text/10' 
                : 'bg-white text-natural-text rounded-tl-none border border-natural-border'
            }`}>
              <div className="prose prose-sm max-w-none prose-stone">
                <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-natural-border flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-natural-purple-text/30 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-natural-purple-text/30 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-natural-purple-text/30 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-5 bg-white border-t border-natural-border">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Ask Joy anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'enter' && sendMessage()}
            className="w-full pl-6 pr-14 py-4 bg-natural-bg rounded-full border-none focus:ring-2 focus:ring-natural-teal-accent shadow-inner text-xs transition-all focus:outline-none"
          />
          <button 
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-natural-text text-white rounded-full shadow-md hover:scale-105 transition-transform disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

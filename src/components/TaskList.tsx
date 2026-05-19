import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Coffee,
  Zap,
  Gift,
  Clock
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { Task, UserProfile, Reward } from '../types';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';

interface TaskListProps {
  user: User;
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
}

export default function TaskList({ user, profile, setProfile }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<'Work' | 'Personal' | 'Errands'>('Personal');
  const [filterCategory, setFilterCategory] = useState<'All' | 'Work' | 'Personal' | 'Errands'>('All');
  const [showAdd, setShowAdd] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const tasksPath = 'tasks';
    const qTasks = query(collection(db, tasksPath), where('userId', '==', user.uid), where('date', '==', today));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, tasksPath);
    });

    const rewardsPath = 'rewards';
    const qRewards = query(collection(db, rewardsPath), where('userId', '==', user.uid));
    const unsubRewards = onSnapshot(qRewards, (snapshot) => {
      setRewards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reward)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, rewardsPath);
    });

    return () => {
      unsubTasks();
      unsubRewards();
    };
  }, [user.uid, today]);

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    const path = 'tasks';
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        title: newTaskTitle,
        category: newTaskCategory,
        completed: false,
        date: today,
        createdAt: new Date().toISOString()
      });
      setNewTaskTitle('');
      setShowAdd(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const toggleTask = async (task: Task) => {
    const path = `tasks/${task.id}`;
    const profilePath = `user_profiles/${user.uid}`;
    try {
      await updateDoc(doc(db, 'tasks', task.id!), { completed: !task.completed });
      if (!task.completed) {
        // Award EXP
        if (profile) {
          const newExp = profile.exp + 5;
          const newLevel = Math.floor(newExp / 100) + 1;
          const updatedProfile = { ...profile, exp: newExp, level: newLevel };
          await updateDoc(doc(db, 'user_profiles', user.uid), updatedProfile);
          setProfile(updatedProfile);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteTask = async (id: string) => {
    const path = `tasks/${id}`;
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const filteredTasks = filterCategory === 'All' 
    ? tasks 
    : tasks.filter(t => t.category === filterCategory);

  const tasksDoneCount = tasks.filter(t => t.completed).length;
  const progressPercentage = tasks.length > 0 ? (tasksDoneCount / tasks.length) * 100 : 0;

  const categories: ('Work' | 'Personal' | 'Errands')[] = ['Work', 'Personal', 'Errands'];

  return (
    <div className="space-y-8 pb-12">
      {/* Task Header & Progression */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-display font-semibold text-natural-text uppercase tracking-widest leading-none mb-1">To Do List</h2>
            <p className="text-[10px] text-natural-purple-text font-bold uppercase tracking-widest leading-none">Your Daily Flow</p>
          </div>
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="p-3 bg-natural-teal-text text-white rounded-full shadow-lg hover:scale-110 transition-transform"
          >
            <Plus />
          </button>
        </div>

        <div className="glass-card p-6 bg-white border-natural-border shadow-sm">
          <div className="flex justify-between items-end mb-3">
            <p className="text-xs font-serif italic text-natural-text">Daily Progression</p>
            <p className="text-[10px] font-bold text-natural-purple-text">{tasksDoneCount}/{tasks.length} Resolved</p>
          </div>
          <div className="h-2 w-full bg-natural-bg rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              className="h-full bg-natural-teal-accent shadow-[0_0_8px_rgba(129,230,217,0.5)]"
            />
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['All', ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat as any)}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${
              filterCategory === cat 
                ? 'bg-natural-text text-white border-natural-text' 
                : 'bg-white text-natural-purple-text border-natural-border hover:border-natural-purple-text/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6 bg-white border-2 border-dashed border-natural-teal-accent space-y-4"
          >
            <input 
              type="text" 
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full p-4 bg-natural-bg rounded-2xl border-none focus:ring-2 focus:ring-natural-teal-accent shadow-inner font-medium text-sm transition-all text-natural-text"
            />
            
            <div className="flex gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setNewTaskCategory(cat)}
                  className={`flex-1 py-3 rounded-xl text-[9px] font-bold uppercase tracking-tighter transition-all border ${
                    newTaskCategory === cat 
                      ? 'bg-natural-teal text-natural-teal-text border-natural-teal-accent shadow-sm' 
                      : 'bg-white text-natural-purple-text border-natural-border'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button 
              onClick={addTask}
              className="w-full py-4 bg-natural-teal-text text-white font-semibold rounded-2xl shadow-md uppercase text-xs tracking-widest font-display hover:brightness-110 active:scale-95 transition-all"
            >
              Create Task
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <motion.div
              layout
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`glass-card p-4 flex items-center justify-between group px-6 transition-all border border-natural-border ${
                task.completed ? 'bg-natural-teal/10 opacity-60 border-transparent shadow-none' : 'bg-white'
              }`}
            >
              <div className="flex items-center space-x-4 flex-1">
                <button 
                  onClick={() => toggleTask(task)}
                  className={`transition-colors flex-shrink-0 ${task.completed ? 'text-natural-teal-text' : 'text-natural-purple-text/30 hover:text-natural-teal-text'}`}
                >
                  {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>
                <div className="flex flex-col">
                  <span className={`text-sm transition-all ${task.completed ? 'line-through text-natural-purple-text font-medium' : 'text-natural-text font-semibold'}`}>
                    {task.title}
                  </span>
                  <span className={`text-[8px] font-bold uppercase tracking-widest ${
                    task.category === 'Work' ? 'text-natural-purple-text' : 
                    task.category === 'Errands' ? 'text-natural-yellow' : 'text-natural-teal-text'
                  }`}>
                    {task.category}
                  </span>
                </div>
              </div>
              <button onClick={() => deleteTask(task.id!)} className="p-2 text-natural-text/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 opacity-30">
            <p className="text-xs font-serif italic text-natural-text">No tasks found here yet...</p>
          </div>
        )}
      </div>

      {/* Reward Section */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-natural-text uppercase tracking-widest flex items-center gap-2">
          Self-Care & Rewards
        </h3>
        <div className="glass-card p-6 bg-natural-teal border border-natural-teal-accent shadow-none">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-bold text-natural-teal-text uppercase tracking-tight">Focus Reward</p>
              <p className="text-[10px] text-natural-teal-text/60 font-bold uppercase tracking-widest mt-1 opacity-70">Complete 3 Tasks</p>
            </div>
            <div className="bg-white p-2.5 rounded-2xl shadow-sm text-natural-teal-text">
              <Clock size={20} />
            </div>
          </div>
          
          <button 
            disabled={tasksDoneCount < 3}
            className={`w-full py-4 rounded-2xl font-bold transition-all shadow-md flex items-center justify-center space-x-2 tracking-widest uppercase text-xs ${
              tasksDoneCount >= 3 
                ? 'bg-natural-teal-accent text-white hover:brightness-110' 
                : 'bg-white/50 text-natural-teal-text/30 cursor-not-allowed'
            }`}
          >
            <Coffee size={18} />
            <span>Claim 15min Break</span>
          </button>
        </div>
      </section>

      {/* Gamification Stats */}
      <section className="bg-natural-purple border border-natural-purple-text/10 rounded-[32px] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-xl p-2 shadow-sm text-natural-yellow">
              <Zap size={20} fill="currentColor" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-natural-text uppercase tracking-tight">Active Streak</h4>
              <p className="text-[10px] text-natural-purple-text font-medium italic">"Consistency is the key to growth!"</p>
            </div>
          </div>
          <span className="text-xl font-display font-semibold text-natural-text">7D</span>
        </div>
      </section>
    </div>
  );
}

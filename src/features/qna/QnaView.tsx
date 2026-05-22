import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MessageSquare, Send, Plus, Search, Sparkles, User, BrainCircuit, Heart, Trash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { aiService } from '../../services/AIService';

export interface QnaAnswer {
  id: string;
  user_name: string;
  avatar_url?: string;
  content: string;
  upvotes: number;
  created_at: string;
  is_ai?: boolean;
}

export interface QnaQuestion {
  id: string;
  user_name: string;
  avatar_url?: string;
  title: string;
  content: string;
  category: string;
  upvotes: number;
  upvoted_by_me?: boolean;
  answers: QnaAnswer[];
  created_at: string;
}

const SEED_QUESTIONS: QnaQuestion[] = [
  {
    id: 'q1',
    user_name: 'Aarav Singhania',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    title: 'How do you keep code scalable when writing React applets?',
    content: 'Is there a limit to how large context state or hooks can get? I want to make sure my mobile-first chatting app doesn\'t choke under high real-time traffic stress.',
    category: 'Tech',
    upvotes: 24,
    upvoted_by_me: false,
    answers: [
      {
        id: 'qa1',
        user_name: 'Grix AI',
        avatar_url: '',
        content: 'To keep React applets fully scaled: 1. Outsource heavy processing to specialized Web Workers or server-less microservices. 2. Implement memoized LocalDataCache structures (storing parsed elements as simple keys and using selective subscription updates rather than re-rendering the outer layouts). 3. Avoid putting fast-changing message streams directly in an over-staggered context state — prefer scoped hooks.',
        upvotes: 11,
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        is_ai: true
      },
      {
        id: 'qa2',
        user_name: 'Nisha Pillai',
        content: 'Agreed! Highly modular folder structures keep things very editable as well!',
        upvotes: 6,
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ],
    created_at: new Date(Date.now() - 3600000 * 6).toISOString()
  },
  {
    id: 'q2',
    user_name: 'Suhana Kapoor',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    title: 'What are some great offbeat places to visit near Himachal Pradesh during June?',
    content: 'Want to spend 3-4 days somewhere quieter than Kasol or Manali. Any local hidden jams with stable internet?',
    category: 'Help',
    upvotes: 15,
    upvoted_by_me: false,
    answers: [
      {
        id: 'qa3',
        user_name: 'Dev Thakur',
        content: 'Check out Jibhi or Shoja in the Tirthan Valley! Extremely pristine, safe, lovely local wooden homestays, and optical fiber has reached main stays!',
        upvotes: 8,
        created_at: new Date(Date.now() - 3600000 * 8).toISOString()
      }
    ],
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

const CATEGORIES = ['All', 'Trend', 'Tech', 'Help', 'Relationship', 'Lifestyle'];

export default function QnaView() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QnaQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Tech');
  const [askAi, setAskAi] = useState(false);
  const [showAskForm, setShowAskForm] = useState(false);
  const [aiAnswering, setAiAnswering] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answerInput, setAnswerInput] = useState('');

  // Hydrate questions safely
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!supabase) {
        setQuestions(SEED_QUESTIONS);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('qna_questions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
          const cached = localStorage.getItem('grix_memory_qna');
          if (cached) {
            setQuestions(JSON.parse(cached));
          } else {
            setQuestions(SEED_QUESTIONS);
          }
        } else {
          const formatted = data.map((q: any) => ({
            ...q,
            answers: Array.isArray(q.answers) ? q.answers : [],
            upvoted_by_me: q.upvoters ? q.upvoters.includes(user?.id) : false
          }));
          setQuestions(formatted);
          localStorage.setItem('grix_memory_qna', JSON.stringify(formatted));
        }
      } catch (e) {
        setQuestions(SEED_QUESTIONS);
      }
    };

    fetchQuestions();
  }, [user?.id]);

  const saveQnaState = (updated: QnaQuestion[]) => {
    setQuestions(updated);
    try {
      localStorage.setItem('grix_memory_qna', JSON.stringify(updated));
    } catch (e) {
      // Ignored if local storage or offline iframe sandboxing blocks it
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const myUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Curious Grixer';
    const myAvatar = user?.user_metadata?.avatar_url || '';

    const newQuestion: QnaQuestion = {
      id: 'q_' + Math.random().toString(36).substr(2, 9),
      user_name: myUserName,
      avatar_url: myAvatar,
      title: newTitle,
      content: newContent,
      category: newCategory,
      upvotes: 0,
      upvoted_by_me: false,
      answers: [],
      created_at: new Date().toISOString()
    };

    let updatedList = [newQuestion, ...questions];
    saveQnaState(updatedList);
    setExpandedId(newQuestion.id);

    // AI Assist response if checked
    if (askAi) {
      setAiAnswering(true);
      try {
        const aiResponseText = await aiService.sendMessage(
          `User asks a community question: "${newTitle}". Detailed content: "${newContent}". Give a concise, professional, insightful answer under 100 words.`
        );

        const aiAnswer: QnaAnswer = {
          id: 'qa_ai_' + Math.random().toString(36).substr(2, 9),
          user_name: 'Grix AI ✨',
          avatar_url: '',
          content: aiResponseText,
          upvotes: 1,
          created_at: new Date().toISOString(),
          is_ai: true
        };

        updatedList = updatedList.map(item => {
          if (item.id === newQuestion.id) {
            return {
              ...item,
              answers: [aiAnswer, ...item.answers]
            };
          }
          return item;
        });

        saveQnaState(updatedList);
      } catch (err) {
        console.error('AI Q&A integration failed', err);
      } finally {
        setAiAnswering(false);
      }
    }

    // Attempt backup save to Supabase
    if (supabase && user) {
      try {
        const itemToSave = updatedList.find(q => q.id === newQuestion.id);
        if (itemToSave) {
          await supabase.from('qna_questions').insert({
            id: itemToSave.id,
            user_name: itemToSave.user_name,
            avatar_url: itemToSave.avatar_url,
            title: itemToSave.title,
            content: itemToSave.content,
            category: itemToSave.category,
            upvotes: itemToSave.upvotes,
            answers: itemToSave.answers,
            created_at: itemToSave.created_at
          });
        }
      } catch (err) {
        console.warn(err);
      }
    }

    // Reset Form
    setNewTitle('');
    setNewContent('');
    setAskAi(false);
    setShowAskForm(false);
  };

  const handleUpvote = async (qId: string) => {
    const updated = questions.map(item => {
      if (item.id === qId) {
        const alreadyUpvoted = !!item.upvoted_by_me;
        return {
          ...item,
          upvoted_by_me: !alreadyUpvoted,
          upvotes: alreadyUpvoted ? item.upvotes - 1 : item.upvotes + 1
        };
      }
      return item;
    });

    saveQnaState(updated);

    if (supabase) {
      try {
        const target = updated.find(q => q.id === qId);
        if (target) {
          await supabase.from('qna_questions').update({
            upvotes: target.upvotes
          } as any).eq('id', qId);
        }
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handlePostAnswer = async (qId: string) => {
    if (!answerInput.trim()) return;

    const myUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Grixer';
    const newAnswer: QnaAnswer = {
      id: 'ans_' + Math.random().toString(36).substr(2, 9),
      user_name: myUserName,
      content: answerInput,
      upvotes: 0,
      created_at: new Date().toISOString()
    };

    const updated = questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          answers: [...q.answers, newAnswer]
        };
      }
      return q;
    });

    saveQnaState(updated);

    if (supabase) {
      try {
        const target = updated.find(q => q.id === qId);
        if (target) {
          await supabase.from('qna_questions').update({
            answers: target.answers
          } as any).eq('id', qId);
        }
      } catch (e) {
        console.warn(e);
      }
    }

    setAnswerInput('');
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (window.confirm('Delete this question permanently?')) {
      const updated = questions.filter(q => q.id !== qId);
      saveQnaState(updated);

      if (supabase) {
        try {
          await supabase.from('qna_questions').delete().eq('id', qId);
        } catch (e) {
          console.warn(e);
        }
      }
    }
  };

  // Filter & Search Logic
  const filteredQuestions = questions.filter(q => {
    const matchesTag = selectedTag === 'All' || q.category.toLowerCase() === selectedTag.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = q.title.toLowerCase().includes(query) || q.content.toLowerCase().includes(query);
    return matchesTag && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-main)] text-[var(--box-text)] pb-24 overflow-y-auto no-scrollbar">
      {/* Category selection bar */}
      <div className="bg-[var(--bg-chat)] border-b border-[var(--border-color)] px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold tracking-tight">Q&A Hub</h2>
        </div>
        <button 
          onClick={() => setShowAskForm(!showAskForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-full text-xs font-semibold shadow-md active:scale-95 transition-all"
        >
          <Plus size={14} /> Ask Question
        </button>
      </div>

      {/* Tag selector filter */}
      <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar bg-[var(--bg-chat)]/30 border-b border-[var(--border-color)]/50">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedTag(cat)}
            className={`px-3 py-1 text-xs rounded-full border transition-all ${selectedTag === cat ? 'bg-indigo-500 border-indigo-500 text-white font-bold' : 'border-[var(--border-color)] hover:border-gray-400 text-gray-400'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {showAskForm && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="m-4 p-4 rounded-2xl bg-[var(--bg-chat)] border border-[var(--border-color)] shadow-xl"
        >
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1 text-indigo-400">
            <BrainCircuit size={15} /> Raise a Query
          </h3>
          <form onSubmit={handleCreateQuestion} className="space-y-3">
            <input
              type="text"
              placeholder="Question Title (e.g., How to handle offline caching?)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full text-sm p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] focus:outline-none focus:ring-1 focus:ring-indigo-400 font-bold"
              required
            />
            
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Add more details, write sample codes or questions..."
              rows={3}
              className="w-full text-xs p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />

            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Category Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-gray-400">Tag:</span>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="bg-[var(--bg-main)] border border-[var(--border-color)] text-xs rounded-xl p-1.5 focus:outline-none"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Ask AI Flag */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={askAi}
                  onChange={(e) => setAskAi(e.target.checked)}
                  className="rounded border-[var(--border-color)] text-indigo-500 focus:ring-indigo-400 w-4 h-4"
                />
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                  Ask Grix AI ✨ <span className="text-[9px] bg-indigo-500/10 px-1 py-0.5 rounded text-indigo-300 font-bold font-sans">GPT/Llama</span>
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAskForm(false)}
                className="px-3 py-1.5 text-xs hover:bg-[var(--bg-main)] rounded-full text-gray-400 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs bg-indigo-500 text-white rounded-full font-bold shadow hover:bg-indigo-600 transition-colors"
              >
                Publish Question
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Fast Filter Bar */}
      <div className="p-4 py-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs p-2.5 pl-9 rounded-xl bg-[var(--bg-chat)] border border-[var(--border-color)] focus:outline-none placeholder:opacity-50 text-[var(--box-text)]"
          />
          <Search size={14} className="absolute left-3 top-3.5 text-gray-400" />
        </div>
      </div>

      {/* Ai Answering state */}
      {aiAnswering && (
        <div className="m-4 p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center gap-2 text-xs">
          <BrainCircuit className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Grix AI is formulating a precise answer to your question...</span>
        </div>
      )}

      {/* Questions list */}
      <div className="p-4 space-y-3">
        {filteredQuestions.map((q) => (
          <div
            key={q.id}
            className="rounded-2xl bg-[var(--bg-chat)] border border-[var(--border-color)] overflow-hidden shadow-sm"
          >
            {/* Header info */}
            <div className="p-4 flex items-start gap-3">
              {/* Upvote score button */}
              <button
                onClick={() => handleUpvote(q.id)}
                className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all ${q.upvoted_by_me ? 'bg-indigo-500 text-white shadow-md' : 'bg-[var(--bg-main)] border border-[var(--border-color)] hover:border-gray-500'}`}
              >
                <ChevronUp size={16} className={`transition-transform duration-300 ${q.upvoted_by_me ? 'scale-110 font-bold' : ''}`} />
                <span className="text-[11px] font-black">{q.upvotes}</span>
              </button>

              <div className="flex-1 space-y-1">
                {/* Upper row user name */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {q.avatar_url ? (
                      <img src={q.avatar_url} className="w-5 h-5 rounded-full object-cover border border-indigo-400/10" alt="avatar" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                        <User size={10} />
                      </div>
                    )}
                    <span className="text-[10px] text-gray-400 font-bold">{q.user_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] bg-indigo-500/15 text-indigo-300 font-extrabold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                      {q.category}
                    </span>
                    {user && q.user_name === (user.user_metadata?.full_name || user.email?.split('@')[0]) && (
                      <button onClick={() => handleDeleteQuestion(q.id)} className="text-gray-400 hover:text-rose-500">
                        <Trash size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <h3 
                  onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  className="text-xs font-bold leading-snug cursor-pointer hover:text-indigo-400 transition-colors"
                >
                  {q.title}
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{q.content}</p>

                {/* Sub row expander */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                    className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold"
                  >
                    <MessageSquare size={12} />
                    <span>{q.answers.length} answers</span>
                  </button>
                  <span className="text-[9px] text-gray-400 font-sans tracking-wide">
                    {new Date(q.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Expander Answers */}
            <AnimatePresence>
              {expandedId === q.id && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="border-t border-[var(--border-color)]/40 bg-[var(--bg-main)]/30 overflow-hidden"
                >
                  <div className="p-3 space-y-2.5">
                    {q.answers.length > 0 ? (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto no-scrollbar">
                        {q.answers.map(ans => (
                          <div 
                            key={ans.id} 
                            className={`p-2.5 rounded-xl border ${ans.is_ai ? 'bg-indigo-950/20 border-indigo-500/20' : 'bg-[var(--bg-chat)] border-[var(--border-color)]'} text-xs space-y-1`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-bold ${ans.is_ai ? 'text-indigo-400 flex items-center gap-1 font-mono uppercase tracking-wider' : 'text-rose-400'}`}>
                                {ans.is_ai && <BrainCircuit size={10} />}
                                {ans.user_name}
                              </span>
                              <span className="text-[8px] text-gray-400 font-mono">
                                {new Date(ans.created_at).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="leading-relaxed text-[var(--box-text)]/90 text-[11px] font-sans">{ans.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 text-center py-2">No answers posted for this question yet. Be the first!</p>
                    )}

                    {/* Answer posting form */}
                    <div className="flex gap-2 pt-1 border-t border-[var(--border-color)]/20">
                      <input
                        type="text"
                        placeholder="Share your opinion, insight or answer..."
                        value={answerInput}
                        onChange={(e) => setAnswerInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePostAnswer(q.id)}
                        className="flex-1 text-[11px] p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] focus:outline-none placeholder:opacity-50"
                      />
                      <button
                        onClick={() => handlePostAnswer(q.id)}
                        className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl active:scale-95 transition-all text-xs flex justify-center items-center"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {filteredQuestions.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest opacity-60">No queries match your filter/search</p>
          </div>
        )}
      </div>
    </div>
  );
}

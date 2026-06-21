import React, { useState } from 'react';
import { X, Plus, Trash2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PollBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (pollData: { question: string; options: string[]; multiple: boolean }) => void;
}

export default function PollBuilderModal({ isOpen, onClose, onCreate }: PollBuilderModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [multiple, setMultiple] = useState(false);

  const handleAddOption = () => {
    if (options.length >= 5) return;
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    const filledOptions = options.map(o => o.trim()).filter(Boolean);
    if (filledOptions.length < 2) return;

    onCreate({
      question: question.trim(),
      options: filledOptions,
      multiple
    });
    setQuestion('');
    setOptions(['', '']);
    setMultiple(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal body */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative bg-[#1e2022] dark:bg-[#1a1b1d] border border-white/10 rounded-3xl shadow-2xl p-6 w-full max-w-md text-white overflow-hidden z-10"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <HelpCircle size={18} />
              </div>
              <h3 className="text-lg font-black tracking-wide text-zinc-100">Create Poll</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-full text-zinc-400 transition-colors border-none bg-transparent cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-1.5 pl-1">
                Question
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                required
                maxLength={100}
                className="w-full px-4 py-3 bg-zinc-900/60 border border-white/5 focus:border-[var(--primary)] text-[15px] font-bold rounded-2xl focus:outline-none transition-colors placeholder:text-zinc-500 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest pl-1">
                Options ({options.length}/5)
              </label>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    required
                    maxLength={50}
                    className="flex-1 px-4 py-2.5 bg-zinc-900/40 border border-white/5 focus:border-[var(--primary)] text-sm rounded-xl focus:outline-none transition-colors placeholder:text-zinc-600 text-white"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border-none bg-transparent cursor-pointer shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              {options.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="w-full py-2.5 bg-zinc-805/30 hover:bg-white/5 border border-dashed border-white/10 text-xs font-bold text-zinc-300 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Option</span>
                </button>
              )}
            </div>

            {/* Checkbox settings */}
            <div className="pt-2 flex items-center justify-between bg-zinc-900/20 p-3 rounded-2xl border border-white/5">
              <div className="flex flex-col">
                <span className="text-xs font-black text-zinc-300 tracking-wide">Multiple Choice</span>
                <span className="text-[10px] text-zinc-500">Allow users to select multiple options</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={multiple} 
                  onChange={(e) => setMultiple(e.target.checked)} 
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-200 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
                className="w-full py-3 bg-[#0494f4] hover:bg-[#0382d6] disabled:opacity-40 text-black font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-md active:scale-98"
              >
                Post Poll
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Box } from 'lucide-react';
import { cn } from '@/app/lib/utils';

interface CustomNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (nodeData: any) => void;
}

const CATEGORIES = [
  { id: 'edge', label: 'Edge / Ingress', color: 'bg-cyan-500', hex: '#06b6d4', text: 'text-cyan-500', border: 'border-cyan-500' },
  { id: 'gateway', label: 'Gateway', color: 'bg-violet-500', hex: '#8b5cf6', text: 'text-violet-500', border: 'border-violet-500' },
  { id: 'compute', label: 'Compute', color: 'bg-emerald-500', hex: '#10b981', text: 'text-emerald-500', border: 'border-emerald-500' },
  { id: 'storage', label: 'Storage & DB', color: 'bg-amber-500', hex: '#f59e0b', text: 'text-amber-500', border: 'border-amber-500' },
  { id: 'messaging', label: 'Messaging', color: 'bg-pink-500', hex: '#ec4899', text: 'text-pink-500', border: 'border-pink-500' },
  { id: 'network', label: 'Network', color: 'bg-indigo-500', hex: '#6366f1', text: 'text-indigo-500', border: 'border-indigo-500' },
];

const CustomNodeModal: React.FC<CustomNodeModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [label, setLabel] = useState('');
  const [subtext, setSubtext] = useState('');
  const [category, setCategory] = useState('compute');

  const categoryToType: Record<string, string> = {
    edge: 'client-web',
    gateway: 'api-gateway',
    compute: 'microservice',
    storage: 'postgresql',
    messaging: 'redis',
    network: 'vpc',
  };

  const handleCreate = () => {
    if (!label.trim()) return;
    onCreate({
      type: categoryToType[category],
      data: {
        label,
        subtext,
        isCustom: true,
      }
    });
    setLabel('');
    setSubtext('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-[90%] max-w-[450px] overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Top strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />

            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shadow-inner">
                  <Box className="text-sky-500" size={20} />
                </div>
                <h2 className="text-lg font-bold text-foreground">Create Custom Node</h2>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose} 
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/5 bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </motion.button>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Node Name (Label)</label>
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g., Payment Gateway"
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Subtext (Optional)</label>
                <input
                  value={subtext}
                  onChange={e => setSubtext(e.target.value)}
                  placeholder="e.g., Stripe API"
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">Category (Determines Color)</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => {
                    const isSelected = category === c.id;
                    return (
                      <motion.div
                        key={c.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCategory(c.id)}
                        className={cn(
                          "px-3 py-2.5 rounded-xl cursor-pointer flex items-center gap-2.5 transition-colors border",
                          isSelected 
                            ? `bg-white/10 ${c.border}` 
                            : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10"
                        )}
                        style={isSelected ? { borderColor: c.hex, backgroundColor: `${c.hex}22` } : {}}
                      >
                        <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", c.color)} style={isSelected ? { boxShadow: `0 0 8px ${c.hex}` } : {}} />
                        <span className={cn("text-xs font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>{c.label}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            <motion.button
              whileHover={label.trim() ? { scale: 1.02 } : {}}
              whileTap={label.trim() ? { scale: 0.98 } : {}}
              onClick={handleCreate}
              disabled={!label.trim()}
              className={cn(
                "w-full py-3 mt-6 rounded-xl text-sm font-bold transition-all shadow-lg",
                label.trim() 
                  ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sky-500/25 hover:shadow-sky-500/40" 
                  : "bg-white/5 text-white/40 cursor-not-allowed shadow-none"
              )}
            >
              Add to Canvas
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CustomNodeModal;

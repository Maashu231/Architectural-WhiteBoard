import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { X, Cloud, Clock, Trash2, Loader2, Database } from 'lucide-react';
import { cn } from '@/app/lib/utils';

const supabase = createClient();

interface LoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (nodes: any[], edges: any[], name: string, id: string) => void;
}

const LoadModal: React.FC<LoadModalProps> = ({ isOpen, onClose, onLoad }) => {
  const [diagrams, setDiagrams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagrams = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('diagrams')
      .select('id, name, created_at, nodes, edges')
      .order('created_at', { ascending: false });

    if (error) {
      setError('Unable to load saved diagrams.');
    } else if (data) {
      setDiagrams(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) void fetchDiagrams();
  }, [fetchDiagrams, isOpen]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }
    const { error } = await supabase.from('diagrams').delete().eq('id', id);
    if (error) {
      setError('Unable to delete this diagram.');
      return;
    }
    setDiagrams(current => current.filter(d => d.id !== id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-[500px] max-h-[80vh] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Top strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />

            <div className="flex justify-between items-center p-6 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shadow-inner">
                  <Cloud className="text-sky-500" size={20} />
                </div>
                <h2 className="text-lg font-bold text-foreground">Saved Diagrams</h2>
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

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3 custom-scrollbar">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3"
                  >
                    <Loader2 size={24} className="animate-spin text-sky-500" />
                    <div className="text-sm font-medium">Fetching diagrams...</div>
                  </motion.div>
                ) : error ? (
                  <motion.div 
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-center text-sm font-medium"
                  >
                    {error}
                  </motion.div>
                ) : diagrams.length === 0 ? (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3"
                  >
                    <Database size={32} className="text-slate-600 mb-2 opacity-50" />
                    <div className="text-sm font-medium">No saved diagrams found.</div>
                    <div className="text-xs text-slate-500 text-center max-w-[200px]">
                      Your saved architecture diagrams will appear here.
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-3"
                  >
                    {diagrams.map((d, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={d.id}
                        onClick={() => onLoad(d.nodes, d.edges, d.name, d.id)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-sky-500/10 hover:border-sky-500/30 cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-sm font-bold text-foreground mb-1.5 group-hover:text-sky-400 transition-colors">
                            {d.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Clock size={12} className="opacity-70" /> 
                            {new Date(d.created_at).toLocaleString(undefined, {
                              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                            })}
                            <span className="w-1 h-1 rounded-full bg-slate-600 mx-1" />
                            <span className="text-sky-500">{d.nodes?.length || 0} nodes</span>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1, color: '#f87171' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleDelete(e, d.id)}
                          className="p-2 text-slate-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LoadModal;

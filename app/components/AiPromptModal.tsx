'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Cpu, Database, Globe, Zap, Server, Shield, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/app/lib/utils';

interface AiPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => Promise<any>;
}

const SUGGESTIONS = [
  { icon: Zap, title: 'Serverless Pipeline', text: 'Design a serverless function architecture with event-driven processing and S3 storage', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { icon: Server, title: 'Microservices', text: 'Microservices architecture for a high-traffic SaaS platform with Kafka and Redis', color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { icon: Globe, title: 'E-Commerce', text: 'E-commerce platform with product catalog, cart, order management and payment service', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { icon: Database, title: 'Data Pipeline', text: 'Real-time data pipeline with Kafka stream processing and analytics warehouse', color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { icon: Cpu, title: 'Kubernetes', text: 'Kubernetes deployment with horizontal pod autoscaling, PostgreSQL and Redis cache', color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { icon: Shield, title: 'Auth System', text: 'Authentication and authorization system with OAuth2, JWT, MFA and audit logging', color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
];

const LOADING_STEPS = [
  'Parsing your infrastructure requirements...',
  'Selecting optimal architecture pattern...',
  'Placing nodes in tiered layout...',
  'Wiring up service connections...',
  'Finalizing the diagram...',
];

const AiPromptModal: React.FC<AiPromptModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<{ name: string; nodes: number; edges: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stepInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError(null);
      setPrompt('');
      setTimeout(() => textareaRef.current?.focus(), 120);
    }
  }, [isOpen]);

  useEffect(() => () => { if (stepInterval.current) clearInterval(stepInterval.current); }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setLoadingStep(0);

    stepInterval.current = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 600);

    try {
      const data = await onGenerate(prompt);
      if (data) {
        setResult({
          name: data.blueprintName ?? 'Architecture',
          nodes: data.nodes?.length ?? 0,
          edges: data.edges?.length ?? 0,
        });
      }
    } catch {
      setError('Generation failed. Please try again.');
    } finally {
      if (stepInterval.current) clearInterval(stepInterval.current);
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleGenerate();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget && !isGenerating) onClose(); }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-[92%] max-w-[660px] max-h-[92vh] overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Top gradient strip */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-pink-500" />

            <div className="p-7 overflow-y-auto max-h-[calc(92vh-2px)] custom-scrollbar">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.4)]">
                      <Sparkles size={18} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      AI Architect
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Describe your system — I'll generate a complete architecture diagram.
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => !isGenerating && onClose()}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border border-white/5 bg-white/5 transition-colors",
                    isGenerating ? "opacity-50 cursor-not-allowed" : "cursor-pointer text-muted-foreground hover:text-foreground"
                  )}
                >
                  <X size={16} />
                </motion.button>
              </div>

              {/* Content */}
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col gap-5"
                  >
                    <div className="p-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <CheckCircle2 size={44} className="text-emerald-500 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-foreground mb-1.5">
                        {result.name} Generated!
                      </h3>
                      <p className="text-sm text-muted-foreground mb-5">
                        Your architecture canvas is ready to explore.
                      </p>
                      <div className="flex justify-center gap-8">
                        <div className="text-center">
                          <div className="text-3xl font-black text-sky-500 leading-none">{result.nodes}</div>
                          <div className="text-xs font-semibold text-muted-foreground mt-1.5">Nodes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-black text-indigo-500 leading-none">{result.edges}</div>
                          <div className="text-xs font-semibold text-muted-foreground mt-1.5">Connections</div>
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onClose()}
                      className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(14,165,233,0.3)] hover:shadow-[0_12px_32px_rgba(14,165,233,0.4)] transition-shadow"
                    >
                      View Diagram <ArrowRight size={16} />
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Prompt textarea */}
                    <div className="relative mb-5">
                      <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g., Design a serverless function architecture with API Gateway, Lambda, S3, and a NoSQL database..."
                        disabled={isGenerating}
                        rows={4}
                        className={cn(
                          "w-full p-4 bg-black/40 border border-sky-500/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 resize-y outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 shadow-inner",
                          isGenerating && "opacity-60 cursor-not-allowed"
                        )}
                      />
                      <div className="absolute bottom-3 right-4 text-[11px] font-medium text-muted-foreground/80">
                        ⌘ + Enter to generate
                      </div>
                    </div>

                    {/* Loading State */}
                    <AnimatePresence>
                      {isGenerating && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginBottom: 20 }}
                          exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl">
                            <div className="flex items-center gap-2.5 mb-3">
                              <Loader2 size={16} className="text-sky-500 animate-spin" />
                              <span className="text-sm font-semibold text-foreground/80">Generating architecture...</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {LOADING_STEPS.map((step, i) => (
                                <motion.div
                                  key={step}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: i <= loadingStep ? (i === loadingStep ? 1 : 0.4) : 0, x: i <= loadingStep ? 0 : -10 }}
                                  className="flex items-center gap-2"
                                >
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                                    i < loadingStep ? "bg-emerald-500" : i === loadingStep ? "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]" : "bg-slate-600"
                                  )} />
                                  <span className={cn(
                                    "text-xs transition-colors duration-300",
                                    i === loadingStep ? "text-foreground" : "text-muted-foreground"
                                  )}>
                                    {step}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Error State */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -10, height: 0 }}
                          className="mb-4"
                        >
                          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive font-medium">
                            ⚠ {error}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Suggestions */}
                    <AnimatePresence>
                      {!isGenerating && !prompt && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-5 overflow-hidden"
                        >
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">
                            Quick start
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {SUGGESTIONS.map((s, i) => (
                              <motion.div
                                key={i}
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setPrompt(s.text)}
                                className={cn(
                                  "p-2.5 rounded-xl border border-white/5 bg-white/[0.02] cursor-pointer transition-colors flex items-start gap-2.5",
                                  `hover:${s.bg} hover:${s.border}`
                                )}
                              >
                                <div className={cn("w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-white/5 border border-white/10", s.color)}>
                                  <s.icon size={14} />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-200 mb-0.5">{s.title}</div>
                                  <div className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                                    {s.text}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Generate button */}
                    <motion.button
                      whileHover={(!isGenerating && prompt.trim()) ? { scale: 1.01 } : {}}
                      whileTap={(!isGenerating && prompt.trim()) ? { scale: 0.98 } : {}}
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim()}
                      className={cn(
                        "w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all duration-300",
                        (isGenerating || !prompt.trim())
                          ? "bg-sky-500/20 text-white/50 cursor-not-allowed"
                          : "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-[0_8px_24px_rgba(14,165,233,0.3)] hover:shadow-[0_12px_32px_rgba(14,165,233,0.4)]"
                      )}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Designing Infrastructure...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Generate Architecture
                        </>
                      )}
                    </motion.button>
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

export default AiPromptModal;
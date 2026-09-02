import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Code, Copy, CheckCircle2, Download } from 'lucide-react';
import { cn } from '@/app/lib/utils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: any[];
  edges: any[];
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, nodes, edges }) => {
  const [exportType, setExportType] = useState<'terraform' | 'docker' | 'mermaid'>('terraform');
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges, format: exportType }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to export architecture');
      }
      if (data.output) {
        setExportResult(data.output);
      } else {
        throw new Error('Export returned no generated code');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error during export';
      setExportResult(`Error: ${message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = () => {
    if (exportResult) {
      navigator.clipboard.writeText(exportResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setExportResult(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={handleClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "relative w-full overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl flex flex-col md:flex-row gap-6 p-6 transition-all duration-300",
              exportResult ? "max-w-[800px] h-[80vh]" : "max-w-[450px]"
            )}
            onClick={e => e.stopPropagation()}
          >
            {/* Top strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-sky-500" />

            <div className={cn("flex flex-col gap-5 transition-all", exportResult ? "w-full md:w-1/3 shrink-0 border-r border-white/5 pr-6" : "w-full")}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                    <Download className="text-emerald-500" size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Export Config</h2>
                </div>
                {!exportResult && (
                  <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClose} 
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/5 bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={16} />
                  </motion.button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">Export Format</label>
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-foreground outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="terraform">Terraform (.tf)</option>
                  <option value="docker">Docker Compose (.yml)</option>
                  <option value="mermaid">Mermaid.js (.md)</option>
                </select>
              </div>

              <AnimatePresence>
                {(exportType === 'terraform' || exportType === 'docker') && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-2.5 items-start p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-200/90 leading-relaxed font-medium">
                        <strong className="text-amber-500">Safety Warning:</strong> AI-generated IaC should be manually reviewed for security and compliance before deployment.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={!isExporting ? { scale: 1.02 } : {}}
                whileTap={!isExporting ? { scale: 0.98 } : {}}
                onClick={handleExport}
                disabled={isExporting}
                className={cn(
                  "w-full py-3 mt-auto rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                  isExporting 
                    ? "bg-emerald-500/20 text-white/50 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-emerald-500 to-sky-500 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40"
                )}
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Code size={16} />
                    Generate Code
                  </>
                )}
              </motion.button>
            </div>

            {/* Result Area */}
            <AnimatePresence>
              {exportResult && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex-1 flex flex-col min-w-0"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                      <Code size={16} className="text-emerald-500" />
                      Generated Output
                    </h3>
                    <div className="flex items-center gap-2">
                      <AnimatePresence>
                        {copied && (
                          <motion.span 
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="text-xs font-bold text-emerald-500 flex items-center gap-1 mr-2"
                          >
                            <CheckCircle2 size={12} /> Copied
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                      >
                        <Copy size={14} /> Copy
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleClose}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-muted-foreground text-xs font-semibold hover:bg-white/10 hover:text-foreground transition-colors"
                      >
                        <X size={14} /> Close
                      </motion.button>
                    </div>
                  </div>

                  <div className="flex-1 relative rounded-xl border border-white/5 bg-black/50 overflow-hidden shadow-inner">
                    <pre className="absolute inset-0 p-4 overflow-auto text-xs text-slate-300 font-mono leading-relaxed custom-scrollbar">
                      <code>{exportResult}</code>
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ExportModal;
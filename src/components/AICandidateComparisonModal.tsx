import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Sparkles, Trophy, CheckCircle2, AlertTriangle, Briefcase, GraduationCap, UserCheck, X } from "lucide-react";
import { motion } from "framer-motion";

export interface CandidateComparisonItem {
  id: string;
  name: string;
  role?: string;
  experience?: string;
  education?: string;
  aiScore?: number;
  skills?: string[];
  aiEvaluation?: any;
}

interface AICandidateComparisonModalProps {
  candidates: CandidateComparisonItem[];
  isOpen: boolean;
  onClose: () => void;
}

export default function AICandidateComparisonModal({
  candidates,
  isOpen,
  onClose,
}: AICandidateComparisonModalProps) {
  if (!candidates || candidates.length === 0) return null;

  // Find winner (highest score)
  const sorted = [...candidates].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
  const winner = sorted[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl" dir="rtl">
        <DialogHeader className="space-y-2 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 ml-1 text-emerald-500" />
              مقارنة التوافق الذكية المفاضلة (AI Comparison Hub)
            </Badge>
          </div>
          <DialogTitle className="text-xl font-black text-foreground">
            مقارنة أداء المرشحين والمفاضلة بين الكفاءات
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Winner AI Banner */}
          {winner && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-blue-500/10 to-indigo-500/10 border border-emerald-500/30 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-sm">
                  <Trophy className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">المرشح الأفضل توافقاً بالذكاء الاصطناعي</span>
                  <h4 className="text-base font-extrabold text-foreground">{winner.name} ({winner.aiScore || 85}%)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">يمتلك أفضل نسبة مطابقة للخبرات والمهارات المطلوبة لشاغر الوظيفة.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Comparison Grid */}
          <div className={`grid grid-cols-1 md:grid-cols-${Math.min(candidates.length, 3)} gap-4`}>
            {candidates.map((c, i) => {
              const parsedEval = typeof c.aiEvaluation === "string" ? (() => { try { return JSON.parse(c.aiEvaluation); } catch { return null; } })() : c.aiEvaluation;
              const isWinner = winner?.id === c.id;

              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-4 rounded-2xl border space-y-4 relative bg-card ${
                    isWinner ? "border-emerald-500 shadow-md shadow-emerald-500/10" : "border-border/80"
                  }`}
                >
                  {isWinner && (
                    <Badge className="absolute -top-3 right-4 bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-0.5 shadow-sm">
                      🏆 الأفضل توافقاً
                    </Badge>
                  )}

                  <div className="text-center pt-2 space-y-1">
                    <h4 className="font-extrabold text-sm text-foreground">{c.name}</h4>
                    <p className="text-xs text-muted-foreground">{c.role || "مرشح للوظيفة"}</p>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                      {c.aiScore || 75}%
                    </div>
                    <Progress value={c.aiScore || 75} className="h-1.5 mt-1" />
                  </div>

                  {/* Details Breakdown */}
                  <div className="space-y-3 pt-2 text-xs border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1 font-bold">
                        <Briefcase className="w-3.5 h-3.5 text-primary" />الخبرة:
                      </span>
                      <span className="font-extrabold text-foreground">{c.experience || "غير محددة"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1 font-bold">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />التعليم:
                      </span>
                      <span className="font-extrabold text-foreground">{c.education || "بكالوريوس"}</span>
                    </div>

                    {/* Skills Pills */}
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-bold block">أبرز المهارات:</span>
                      <div className="flex flex-wrap gap-1">
                        {(c.skills || []).slice(0, 5).map((sk) => (
                          <Badge key={sk} variant="secondary" className="text-[9px] font-bold px-1.5 py-0.5">
                            {sk}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Strengths */}
                    {parsedEval?.strengths && (
                      <div className="space-y-1">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold block">أهم الميزات:</span>
                        <ul className="space-y-1">
                          {parsedEval.strengths.slice(0, 2).map((s: string, idx: number) => (
                            <li key={idx} className="text-[10px] text-muted-foreground flex items-start gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 pt-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl h-10 text-xs font-bold">
            إغلاق المقارنة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, memo, useCallback } from "react";
import { Editor } from "@tiptap/react";
import {
  BarChart3,
  X,
  BookOpen,
  Zap,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ReadabilityAnalyticsProps {
  editor: Editor;
  onClose: () => void;
}

interface Analytics {
  fleschKincaid: number;
  gradeLevel: string;
  avgSentenceLength: number;
  avgWordLength: number;
  paragraphCount: number;
  sentenceCount: number;
  passiveVoiceCount: number;
  passiveVoicePercent: number;
  vocabularyDiversity: number;
  longSentences: number;
  speakingTime: number;
}

function computeAnalytics(text: string): Analytics {
  if (!text.trim()) {
    return {
      fleschKincaid: 0,
      gradeLevel: "—",
      avgSentenceLength: 0,
      avgWordLength: 0,
      paragraphCount: 0,
      sentenceCount: 0,
      passiveVoiceCount: 0,
      passiveVoicePercent: 0,
      vocabularyDiversity: 0,
      longSentences: 0,
      speakingTime: 0,
    };
  }

  const plainText = text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = plainText.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Sentences
  const sentences = plainText
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  // Syllables (approximation)
  const countSyllables = (word: string): number => {
    const w = word.toLowerCase().replace(/[^a-z]/g, "");
    if (w.length <= 3) return 1;
    const count =
      w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").match(/[aeiouy]{1,2}/g)
        ?.length || 1;
    return Math.max(1, count);
  };
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  // Flesch-Kincaid
  const fk =
    wordCount > 0
      ? 206.835 -
        1.015 * (wordCount / sentenceCount) -
        84.6 * (totalSyllables / wordCount)
      : 0;
  const fleschKincaid = Math.max(0, Math.min(100, Math.round(fk * 10) / 10));

  // Grade level
  const getGrade = (score: number): string => {
    if (score >= 90) return "5th Grade (Very Easy)";
    if (score >= 80) return "6th Grade (Easy)";
    if (score >= 70) return "7th Grade (Fairly Easy)";
    if (score >= 60) return "8th-9th Grade (Standard)";
    if (score >= 50) return "10th-12th Grade (Fairly Hard)";
    if (score >= 30) return "College (Hard)";
    return "Graduate (Very Hard)";
  };

  // Passive voice detection (simple heuristic)
  const passivePatterns =
    /\b(was|were|been|being|is|are|am|be)\s+(\w+ed|(\w+en))\b/gi;
  const passiveMatches = plainText.match(passivePatterns) || [];
  const passiveVoicePercent =
    sentenceCount > 0
      ? Math.round((passiveMatches.length / sentenceCount) * 100)
      : 0;

  // Vocabulary diversity (unique words / total words)
  const uniqueWords = new Set(
    words.map((w) => w.toLowerCase().replace(/[^a-z'-]/g, "")),
  );
  const vocabularyDiversity =
    wordCount > 0 ? Math.round((uniqueWords.size / wordCount) * 100) : 0;

  // Long sentences (>25 words)
  const longSentences = sentences.filter(
    (s) => s.trim().split(/\s+/).length > 25,
  ).length;

  // Paragraphs
  const paragraphCount =
    plainText.split(/\n\n+/).filter((p) => p.trim().length > 0).length || 1;

  // Avg word & sentence length
  const avgWordLength =
    wordCount > 0
      ? Math.round((plainText.replace(/\s+/g, "").length / wordCount) * 10) / 10
      : 0;
  const avgSentenceLength = Math.round((wordCount / sentenceCount) * 10) / 10;

  // Speaking time (150 wpm)
  const speakingTime = Math.max(1, Math.ceil(wordCount / 150));

  return {
    fleschKincaid,
    gradeLevel: getGrade(fleschKincaid),
    avgSentenceLength,
    avgWordLength,
    paragraphCount,
    sentenceCount,
    passiveVoiceCount: passiveMatches.length,
    passiveVoicePercent,
    vocabularyDiversity,
    longSentences,
    speakingTime,
  };
}

const ScoreIndicator = ({ score }: { score: number }) => {
  const color =
    score >= 70
      ? "text-green-600"
      : score >= 50
        ? "text-yellow-600"
        : "text-red-600";
  const bgColor =
    score >= 70 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="text-center space-y-1.5">
      <div className={`text-3xl font-display font-bold ${color}`}>{score}</div>
      <Progress value={score} className={`h-1.5 [&>div]:${bgColor}`} />
    </div>
  );
};

const ReadabilityAnalytics = memo(
  ({ editor, onClose }: ReadabilityAnalyticsProps) => {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);

    const analyze = useCallback(() => {
      const html = editor.getHTML();
      setAnalytics(computeAnalytics(html));
    }, [editor]);

    useEffect(() => {
      analyze();
      const handler = () => analyze();
      editor.on("update", handler);
      return () => {
        editor.off("update", handler);
      };
    }, [editor, analyze]);

    if (!analytics) return null;

    return (
      <div className="border border-border/50 rounded-lg bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="font-ui text-sm font-semibold">Readability</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Score */}
        <ScoreIndicator score={analytics.fleschKincaid} />
        <p className="text-xs font-ui text-muted-foreground text-center">
          {analytics.gradeLevel}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={<BookOpen className="h-3 w-3" />}
            label="Sentences"
            value={analytics.sentenceCount}
          />
          <StatCard
            icon={<BookOpen className="h-3 w-3" />}
            label="Paragraphs"
            value={analytics.paragraphCount}
          />
          <StatCard
            icon={<Zap className="h-3 w-3" />}
            label="Avg Sentence"
            value={`${analytics.avgSentenceLength} words`}
          />
          <StatCard
            icon={<Zap className="h-3 w-3" />}
            label="Avg Word"
            value={`${analytics.avgWordLength} chars`}
          />
        </div>

        {/* Warnings */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <Indicator
            good={analytics.passiveVoicePercent < 15}
            label={`Passive voice: ${analytics.passiveVoicePercent}%`}
            hint={
              analytics.passiveVoicePercent >= 15
                ? "Try using more active voice"
                : "Good use of active voice"
            }
          />
          <Indicator
            good={analytics.longSentences === 0}
            label={`Long sentences: ${analytics.longSentences}`}
            hint={
              analytics.longSentences > 0
                ? "Consider breaking long sentences"
                : "Sentence length is good"
            }
          />
          <Indicator
            good={analytics.vocabularyDiversity >= 40}
            label={`Vocabulary diversity: ${analytics.vocabularyDiversity}%`}
            hint={
              analytics.vocabularyDiversity < 40
                ? "Try using more varied words"
                : "Good word variety"
            }
          />
        </div>

        {/* Speaking Time */}
        <div className="text-xs font-ui text-muted-foreground text-center pt-1 border-t border-border/50">
          🎤 ~{analytics.speakingTime} min speaking time
        </div>
      </div>
    );
  },
);

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) => (
  <div className="rounded-md bg-muted/50 p-2 text-center">
    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
      {icon}
    </div>
    <div className="text-sm font-display font-semibold text-foreground">
      {value}
    </div>
    <div className="text-[10px] font-ui text-muted-foreground">{label}</div>
  </div>
);

const Indicator = ({
  good,
  label,
  hint,
}: {
  good: boolean;
  label: string;
  hint: string;
}) => (
  <div className="flex items-start gap-2 text-xs font-ui">
    {good ? (
      <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
    ) : (
      <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 shrink-0 mt-0.5" />
    )}
    <div>
      <div className="font-medium text-foreground">{label}</div>
      <div className="text-muted-foreground">{hint}</div>
    </div>
  </div>
);

ReadabilityAnalytics.displayName = "ReadabilityAnalytics";

export default ReadabilityAnalytics;

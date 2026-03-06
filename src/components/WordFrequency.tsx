import { useState, useEffect, memo, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { BarChart3, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WordFrequencyProps {
  editor: Editor;
  onClose: () => void;
}

interface WordEntry {
  word: string;
  count: number;
  percent: number;
}

const STOP_WORDS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
  "or", "an", "will", "my", "one", "all", "would", "there", "their",
  "what", "so", "up", "out", "if", "about", "who", "get", "which", "go",
  "me", "when", "make", "can", "like", "time", "no", "just", "him",
  "know", "take", "people", "into", "year", "your", "good", "some",
  "could", "them", "than", "then", "now", "look", "only", "come", "its",
  "over", "think", "also", "back", "after", "use", "two", "how", "our",
  "work", "first", "well", "way", "even", "new", "want", "because",
  "any", "these", "give", "day", "most", "us", "is", "are", "was",
  "were", "been", "has", "had", "did", "does", "am",
]);

function analyzeWords(text: string): WordEntry[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  const total = words.length;
  return Array.from(freq.entries())
    .map(([word, count]) => ({
      word,
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .filter((e) => e.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

const WordFrequency = memo(({ editor, onClose }: WordFrequencyProps) => {
  const [entries, setEntries] = useState<WordEntry[]>([]);

  const analyze = useCallback(() => {
    const text = editor.state.doc.textContent;
    setEntries(analyzeWords(text));
  }, [editor]);

  useEffect(() => {
    analyze();
    const handler = () => analyze();
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, analyze]);

  const maxCount = entries.length > 0 ? entries[0].count : 1;

  return (
    <div className="border border-border/50 rounded-lg bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="font-ui text-sm font-semibold">Word Frequency</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs font-ui text-muted-foreground">
          Write more content to see word frequency analysis. Words appearing 2+ times will show here.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {entries.map(({ word, count, percent }) => (
            <div key={word} className="group">
              <div className="flex items-center justify-between text-xs font-ui">
                <button
                  className="font-medium text-foreground hover:text-primary transition-colors text-left"
                  onClick={() => {
                    // Highlight first occurrence
                    const text = editor.state.doc.textContent;
                    const idx = text.toLowerCase().indexOf(word);
                    if (idx >= 0) {
                      let targetPos = -1;
                      editor.state.doc.descendants((node, nodePos) => {
                        if (targetPos >= 0) return false;
                        if (node.isText) {
                          const nodeText = (node.text || "").toLowerCase();
                          const wordIdx = nodeText.indexOf(word);
                          if (wordIdx >= 0) {
                            targetPos = nodePos + wordIdx;
                            return false;
                          }
                        }
                      });
                      if (targetPos >= 0) {
                        editor.chain().focus().setTextSelection({
                          from: targetPos,
                          to: targetPos + word.length,
                        }).run();
                      }
                    }
                  }}
                >
                  {word}
                </button>
                <span className="text-muted-foreground tabular-nums">
                  {count}x ({percent}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1 mt-0.5">
                <div
                  className="bg-primary/60 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

WordFrequency.displayName = "WordFrequency";

export default WordFrequency;

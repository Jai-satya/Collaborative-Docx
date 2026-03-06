import { useState, useEffect, memo } from "react";
import { Editor } from "@tiptap/react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Trophy, Flame, X } from "lucide-react";

interface WritingGoalsProps {
  editor: Editor;
  onClose: () => void;
}

const WritingGoals = memo(({ editor, onClose }: WritingGoalsProps) => {
  const [wordGoal, setWordGoal] = useState(() => {
    const saved = localStorage.getItem("writing-goal-words");
    return saved ? parseInt(saved, 10) : 500;
  });
  const [sessionStart] = useState(() => {
    const saved = localStorage.getItem("writing-session-start-words");
    return saved
      ? parseInt(saved, 10)
      : (editor.storage.characterCount?.words() ?? 0);
  });
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem("writing-streak");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [goalInput, setGoalInput] = useState(wordGoal.toString());

  const currentWords = editor.storage.characterCount?.words() ?? 0;
  const sessionWords = Math.max(0, currentWords - sessionStart);
  const progress = Math.min(100, Math.round((sessionWords / wordGoal) * 100));
  const goalMet = sessionWords >= wordGoal;

  useEffect(() => {
    localStorage.setItem(
      "writing-session-start-words",
      sessionStart.toString(),
    );
  }, [sessionStart]);

  useEffect(() => {
    if (goalMet) {
      const today = new Date().toDateString();
      const lastGoalDate = localStorage.getItem("writing-goal-last-met");
      if (lastGoalDate !== today) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        localStorage.setItem("writing-streak", newStreak.toString());
        localStorage.setItem("writing-goal-last-met", today);
      }
    }
  }, [goalMet, streak]);

  const handleSetGoal = () => {
    const value = parseInt(goalInput, 10);
    if (value > 0 && value <= 100000) {
      setWordGoal(value);
      localStorage.setItem("writing-goal-words", value.toString());
      setIsEditing(false);
    }
  };

  return (
    <div className="border border-border/50 rounded-lg bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="font-ui text-sm font-semibold">Writing Goals</h3>
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

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-ui text-muted-foreground">
          <span>
            {sessionWords.toLocaleString()} / {wordGoal.toLocaleString()} words
          </span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        {goalMet && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-ui font-medium animate-fade-in">
            <Trophy className="h-3.5 w-3.5" />
            Goal reached! Great work!
          </div>
        )}
      </div>

      {/* Goal Setting */}
      {isEditing ? (
        <div className="flex gap-2">
          <Input
            type="number"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            className="h-8 text-xs font-ui"
            min={1}
            max={100000}
            onKeyDown={(e) => e.key === "Enter" && handleSetGoal()}
          />
          <Button
            size="sm"
            className="h-8 text-xs font-ui"
            onClick={handleSetGoal}
          >
            Set
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs font-ui"
          onClick={() => {
            setGoalInput(wordGoal.toString());
            setIsEditing(true);
          }}
        >
          Change Goal ({wordGoal.toLocaleString()} words)
        </Button>
      )}

      {/* Streak */}
      <div className="flex items-center gap-2 text-xs font-ui text-muted-foreground pt-1 border-t border-border/50">
        <Flame
          className={`h-3.5 w-3.5 ${streak > 0 ? "text-orange-500" : ""}`}
        />
        <span>{streak} day streak</span>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md bg-muted/50 p-2">
          <div className="text-lg font-display font-semibold text-foreground">
            {currentWords.toLocaleString()}
          </div>
          <div className="text-[10px] font-ui text-muted-foreground">
            Total Words
          </div>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <div className="text-lg font-display font-semibold text-foreground">
            {sessionWords.toLocaleString()}
          </div>
          <div className="text-[10px] font-ui text-muted-foreground">
            Session Words
          </div>
        </div>
      </div>
    </div>
  );
});

WritingGoals.displayName = "WritingGoals";

export default WritingGoals;

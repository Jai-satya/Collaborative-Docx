import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, RotateCcw, Coffee } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Phase = "work" | "break" | "longBreak";

const DURATIONS: Record<Phase, number> = {
  work: 25 * 60,
  break: 5 * 60,
  longBreak: 15 * 60,
};

const PHASE_LABELS: Record<Phase, string> = {
  work: "Focus",
  break: "Break",
  longBreak: "Long Break",
};

const PomodoroTimer = memo(() => {
  const [phase, setPhase] = useState<Phase>("work");
  const [timeLeft, setTimeLeft] = useState(DURATIONS.work);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, phase]);

  const handlePhaseComplete = useCallback(() => {
    setIsRunning(false);
    // Notify
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(
        phase === "work" ? "Time for a break!" : "Back to work!",
      );
    }

    if (phase === "work") {
      const newCount = completedPomodoros + 1;
      setCompletedPomodoros(newCount);
      if (newCount % 4 === 0) {
        setPhase("longBreak");
        setTimeLeft(DURATIONS.longBreak);
      } else {
        setPhase("break");
        setTimeLeft(DURATIONS.break);
      }
    } else {
      setPhase("work");
      setTimeLeft(DURATIONS.work);
    }
  }, [phase, completedPomodoros]);

  const toggleTimer = () => {
    if (
      !isRunning &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(DURATIONS[phase]);
  };

  const switchPhase = (newPhase: Phase) => {
    setIsRunning(false);
    setPhase(newPhase);
    setTimeLeft(DURATIONS[newPhase]);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((DURATIONS[phase] - timeLeft) / DURATIONS[phase]) * 100;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-xs font-ui text-muted-foreground hover:text-foreground transition-colors">
          <Timer
            className={`h-3 w-3 ${isRunning ? "text-primary animate-pulse-subtle" : ""}`}
          />
          {isRunning && (
            <span className="tabular-nums">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end" side="top">
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="font-ui text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {PHASE_LABELS[phase]}
            </h4>
            <div className="text-4xl font-display font-bold tabular-nums text-foreground">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </div>
            {/* Progress ring */}
            <div className="w-full bg-muted rounded-full h-1 mt-2">
              <div
                className="bg-primary h-1 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={toggleTimer}
            >
              {isRunning ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={resetTimer}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex justify-center gap-1">
            {(["work", "break", "longBreak"] as Phase[]).map((p) => (
              <Button
                key={p}
                variant={phase === p ? "default" : "ghost"}
                size="sm"
                className="h-7 text-[10px] font-ui px-2"
                onClick={() => switchPhase(p)}
              >
                {p === "longBreak" ? "Long" : PHASE_LABELS[p]}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs font-ui text-muted-foreground pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Coffee className="h-3 w-3" />
              <span>{completedPomodoros} pomodoros</span>
            </div>
            <span>{Math.round(completedPomodoros * 25)} min focused</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

PomodoroTimer.displayName = "PomodoroTimer";

export default PomodoroTimer;

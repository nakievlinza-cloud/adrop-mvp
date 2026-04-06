import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ProcessFlowProps {
  type: "ugc" | "clip";
  currentStep?: number;
}

export function ProcessFlow({ type, currentStep = 1 }: ProcessFlowProps) {
  const isUGC = type === "ugc";
  
  const steps = isUGC 
    ? ["Бриф", "Съемка", "Проверка", "Публикация"]
    : ["Бриф", "Монтаж", "Интеграция", "Проверка", "Публикация"];

  return (
    <div className="flex items-center w-full">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors z-10",
                  isCompleted 
                    ? (isUGC ? "bg-ugc-primary text-white" : "bg-clip-primary text-white")
                    : isCurrent
                      ? (isUGC ? "bg-ugc-primary/20 text-ugc-primary border-2 border-ugc-primary" : "bg-clip-primary/20 text-clip-primary border-2 border-clip-primary")
                      : "bg-card border-2 border-white/10 text-foreground/50"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
              </div>
              <div className="absolute top-10 text-xs font-medium whitespace-nowrap text-foreground/60">
                {step}
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <div className="flex-1 h-[2px] mx-2 bg-white/10 relative">
                <div 
                  className={cn(
                    "absolute top-0 left-0 h-full transition-all duration-500",
                    isUGC ? "bg-ugc-primary" : "bg-clip-primary"
                  )}
                  style={{ width: isCompleted ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

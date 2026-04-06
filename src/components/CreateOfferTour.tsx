import { CSSProperties, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

interface TourStep {
  target: string;
  title: string;
  description: string;
  image?: string;
  position: "top" | "bottom" | "left" | "right";
}

type RectState = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const TOUR_CARD_GAP = 20;
const tourSteps: TourStep[] = [
  {
    target: "offer-title",
    title: "Название оффера",
    description: "Введите рабочее название оффера. Для теста подойдёт что-то вроде: 'Тестовый оффер для crypto UGC'.",
    position: "bottom"
  },
  {
    target: "offer-description",
    title: "Описание продукта",
    description: "Коротко опишите продукт, задачу и что должен понять креатор. Это поле можно заполнять сразу, не закрывая подсказку.",
    position: "bottom"
  },
  {
    target: "offer-verticals",
    title: "Вертикали",
    description: "Выберите основную вертикаль проекта. Начните с той ниши, под которую хотите собрать первых релевантных креаторов.",
    position: "right"
  },
  {
    target: "offer-geo",
    title: "География",
    description: "Укажите GEO, на которое будет работать оффер. Так креаторы сразу поймут, под какую аудиторию нужен контент.",
    position: "left"
  },
  {
    target: "offer-budget",
    title: "Бюджет",
    description: "Заполните бюджет и количество интеграций. Минимальный бюджет кампании — $100: так отклики будут ближе к реальности, а сам оффер будет выглядеть серьёзнее для креаторов.",
    position: "top"
  },
  {
    target: "offer-deadline",
    title: "Срок выполнения",
    description: "Поставьте дедлайн, к которому нужен готовый материал. Для первого теста обычно удобно ставить 3-7 дней.",
    position: "top"
  },
  {
    target: "offer-requirements",
    title: "Требования к креатору",
    description: "Опишите формат, ключевые тезисы и что обязательно показать в ролике. Это одна из самых важных частей оффера.",
    position: "top"
  },
  {
    target: "offer-submit",
    title: "Опубликовать",
    description: "Когда основные поля заполнены, публикуйте оффер. Если не готовы, можно сначала сохранить черновик и вернуться позже.",
    position: "top"
  }
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readTargetRect(step: TourStep): RectState | null {
  const targetElement = document.getElementById(step.target);
  if (!targetElement) return null;

  const rect = targetElement.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

export function CreateOfferTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [active, setActive] = useState(false);
  const [targetRect, setTargetRect] = useState<RectState | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") === "true") {
      setActive(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    const currentTourStep = tourSteps[currentStep];
    const targetElement = document.getElementById(currentTourStep.target);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: viewport.height < 900 ? "start" : "center",
        inline: "nearest",
      });
    }
  }, [active, currentStep, viewport.height]);

  useEffect(() => {
    if (!active) return;

    const updateRect = () => {
      setTargetRect(readTargetRect(tourSteps[currentStep]));
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    const intervalId = window.setInterval(updateRect, 120);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      window.clearInterval(intervalId);
    };
  }, [active, currentStep]);

  const handleClose = () => {
    setActive(false);
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((step) => step + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1);
    }
  };

  const compactLayout = viewport.width < 1100 || viewport.height < 840;
  const currentTourStep = tourSteps[currentStep];

  const tooltipStyle = useMemo<CSSProperties>(() => {
    const maxWidth = Math.min(420, Math.max(320, viewport.width - 24));

    if (compactLayout || !targetRect) {
      return {
        left: "50%",
        bottom: 16,
        transform: "translateX(-50%)",
        width: `min(${maxWidth}px, calc(100vw - 1.5rem))`,
      };
    }

    const estimatedHeight = 280;
    let left = targetRect.left;
    let top = targetRect.top;

    if (currentTourStep.position === "bottom") {
      left = targetRect.left + targetRect.width / 2 - maxWidth / 2;
      top = targetRect.top + targetRect.height + TOUR_CARD_GAP;
    }

    if (currentTourStep.position === "top") {
      left = targetRect.left + targetRect.width / 2 - maxWidth / 2;
      top = targetRect.top - estimatedHeight - TOUR_CARD_GAP;
    }

    if (currentTourStep.position === "right") {
      left = targetRect.left + targetRect.width + TOUR_CARD_GAP;
      top = targetRect.top + targetRect.height / 2 - estimatedHeight / 2;
    }

    if (currentTourStep.position === "left") {
      left = targetRect.left - maxWidth - TOUR_CARD_GAP;
      top = targetRect.top + targetRect.height / 2 - estimatedHeight / 2;
    }

    return {
      left: clamp(left, 12, Math.max(12, viewport.width - maxWidth - 12)),
      top: clamp(top, 12, Math.max(12, viewport.height - estimatedHeight - 12)),
      width: maxWidth,
    };
  }, [compactLayout, currentTourStep.position, targetRect, viewport.height, viewport.width]);

  if (!active) return null;

  return (
    <>
      <AnimatePresence>
        {targetRect && (
          <motion.div
            key={`highlight-${currentStep}`}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="fixed pointer-events-none z-30 transition-all duration-300"
            style={{
              top: Math.max(targetRect.top - 8, 8),
              left: Math.max(targetRect.left - 8, 8),
              width: Math.min(targetRect.width + 16, Math.max(0, viewport.width - Math.max(targetRect.left - 8, 8) - 8)),
              height: targetRect.height + 16,
              borderRadius: 24,
              boxShadow:
                "0 0 0 2px rgba(6, 182, 212, 0.55), 0 0 0 6px rgba(6, 182, 212, 0.12), 0 12px 36px rgba(6, 182, 212, 0.18)",
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        <motion.div
          key={`tooltip-${currentStep}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed z-50 bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          style={tooltipStyle}
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-foreground/60" />
          </button>

          <div className="h-1 bg-white/5">
            <motion.div
              className="h-full bg-clip-primary"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-clip-primary/20 rounded-lg flex items-center justify-center text-sm font-bold text-clip-primary">
                {currentStep + 1}
              </div>
              <span className="text-sm text-foreground/60">из {tourSteps.length}</span>
            </div>

            <h3 className="text-lg sm:text-xl font-bold mb-2 pr-10">{currentTourStep.title}</h3>
            <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
              {currentTourStep.description}
            </p>

            <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/8 px-3 py-2 text-xs text-emerald-200/90">
              Форма остаётся активной: можно сразу вводить данные, менять значения и не ждать окончания тура.
            </div>

            {compactLayout && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground/60">
                Форма автоматически прокручена к нужному блоку. На небольших экранах подсказка закрепляется снизу, но поля при этом остаются доступными.
              </div>
            )}

            {currentTourStep.image && (
              <div className="mt-4 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                <img src={currentTourStep.image} alt="Example" className="w-full" />
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="h-11 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад
              </button>

              <button
                onClick={handleNext}
                className="flex-1 h-11 px-6 rounded-xl bg-clip-primary hover:bg-clip-primary/90 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {currentStep === tourSteps.length - 1 ? "Завершить" : "Далее"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

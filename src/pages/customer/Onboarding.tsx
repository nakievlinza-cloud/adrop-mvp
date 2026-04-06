import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { CheckCircle2, ArrowRight, LayoutGrid, Play, ChevronRight, X } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";

export function CustomerOnboarding() {
  const { user } = useAuthStore();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [closing, setClosing] = useState(false);

  const handleComplete = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          onboardingCompleted: true,
        });
      } catch (error) {
        console.error("Error updating onboarding:", error);
      }
    }
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setLocation("/customer/dashboard");
    }, 300);
  };

  const handleActionClick = async (link: string) => {
    await handleComplete();
    setClosing(true);
    setTimeout(() => {
      setLocation(link);
    }, 300);
  };

  const handleCompleteAndClose = async () => {
    await handleComplete();
    setClosing(true);
    setTimeout(() => {
      setLocation("/customer/dashboard");
    }, 300);
  };

  const steps = [
    {
      number: 1,
      title: "Создайте оффер",
      description: "Опишите вашу кампанию, укажите требования и бюджет. Минимальный бюджет кампании — $100: так оффер выглядит серьёзно для креаторов и быстрее получает живые отклики.",
      icon: LayoutGrid,
      action: "Перейти к созданию",
      link: "/customer/create-offer",
      accent: "clip",
      listTitle: "Что указать в оффере:",
      items: [
        "Название и описание продукта",
        "Требования к креатору (вертикаль, ГЕО)",
        "Бюджет кампании от $100 и срок выполнения",
      ],
    },
    {
      number: 2,
      title: "Выберите креаторов",
      description: "Просмотрите базу креаторов, фильтруйте по вертикалям и ГЕО. Пригласите подходящих кандидатов.",
      icon: Play,
      action: "Найти креаторов",
      link: "/customer/creators",
      accent: "ugc",
      listTitle: "Как выбрать креатора:",
      items: [
        "Фильтруйте по нише и GEO",
        "Изучите портфолио и описание",
        "Пригласите в оффер или начните чат",
      ],
    },
    {
      number: 3,
      title: "Получайте контент",
      description: "Креаторы создадут UGC контент по вашему ТЗ. Одобрите результат и получите материалы.",
      icon: CheckCircle2,
      action: "Мои заказы",
      link: "/customer/orders",
      accent: "success",
      listTitle: "Всё готово!",
      items: [
        "У вас есть все основы для запуска первой UGC кампании.",
        "Все ключевые действия доступны в верхнем меню и через кнопки ниже.",
      ],
    },
  ] as const;

  const currentStep = steps[step - 1];
  const AccentIcon = currentStep.icon;
  const accentClasses =
    currentStep.accent === "clip"
      ? {
          panel: "bg-clip-primary/10 border-clip-primary/20",
          icon: "bg-clip-primary/10 text-clip-primary",
          step: "bg-clip-primary text-white",
          stepMuted: "text-clip-primary",
          button: "bg-clip-primary hover:bg-clip-primary/90",
        }
      : currentStep.accent === "ugc"
        ? {
            panel: "bg-ugc-primary/10 border-ugc-primary/20",
            icon: "bg-ugc-primary/10 text-ugc-primary",
            step: "bg-ugc-primary text-white",
            stepMuted: "text-ugc-primary",
            button: "bg-ugc-primary hover:bg-ugc-primary/90",
          }
        : {
            panel: "bg-green-500/10 border-green-500/20",
            icon: "bg-green-500/10 text-green-400",
            step: "bg-green-500 text-white",
            stepMuted: "text-green-400",
            button: "bg-green-500 hover:bg-green-600",
          };

  return (
    <AnimatePresence>
      {!closing && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-3xl max-h-[calc(100vh-2rem)] bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="bg-gradient-to-r from-clip-primary/20 to-ugc-primary/20 px-6 py-6 sm:px-8 sm:py-8 text-center relative shrink-0">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white mb-2">
                  Добро пожаловать в ADROP!
                </h2>
                <p className="text-white/80 max-w-xl mx-auto text-sm sm:text-base">
                  Ваш аккаунт создан. Давайте за несколько шагов разберём, как быстро запустить первую кампанию.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                  {steps.map((item, index) => (
                    <div key={item.number} className="flex items-center min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          step >= item.number ? "bg-clip-primary text-white" : "bg-white/10 text-foreground/50"
                        }`}
                      >
                        {step > item.number ? <CheckCircle2 className="w-4 h-4" /> : item.number}
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`w-10 sm:w-16 h-1 mx-1 sm:mx-2 rounded-full transition-colors ${
                            step > item.number ? "bg-clip-primary" : "bg-white/10"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="text-center"
                  >
                    <div className="py-2 sm:py-4">
                      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 ${accentClasses.icon}`}>
                        <AccentIcon className="w-10 h-10" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">{currentStep.title}</h3>
                      <p className="text-foreground/60 mb-6 sm:mb-8 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
                        {currentStep.description}
                      </p>

                      <div className={`border rounded-2xl p-5 sm:p-6 text-left mb-6 sm:mb-8 max-w-xl mx-auto ${accentClasses.panel}`}>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm ${accentClasses.step}`}>
                            {currentStep.number}
                          </span>
                          {currentStep.listTitle}
                        </h4>
                        <ul className="space-y-3 text-sm text-foreground/75">
                          {currentStep.items.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <ChevronRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${accentClasses.stepMuted}`} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={() => void handleActionClick(currentStep.number === 1 ? `${currentStep.link}?tour=true` : currentStep.link)}
                          className={`flex-1 h-12 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${accentClasses.button}`}
                        >
                          {currentStep.action} <ArrowRight className="w-4 h-4" />
                        </button>
                        {step < steps.length ? (
                          <button
                            onClick={() => setStep((current) => current + 1)}
                            className="w-full sm:w-auto h-12 px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors"
                          >
                            Пропустить
                          </button>
                        ) : (
                          <button
                            onClick={() => void handleCompleteAndClose()}
                            className="w-full sm:w-auto h-12 px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors"
                          >
                            На дашборд
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

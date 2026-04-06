import { create } from 'zustand';

interface CMSState {
  heroLine1: string;
  heroLine2: string;
  heroLine3: string;
  heroLine4: string;
  heroDescription: string;
  howItWorksTitle: string;
  howItWorksSteps: { title: string; description: string }[];
  testimonialsTitle: string;
  testimonials: { name: string; role: string; text: string; avatar: string }[];
  faqTitle: string;
  faqItems: { question: string; answer: string }[];
  updateField: (field: keyof Omit<CMSState, 'updateField'>, value: any) => void;
}

export const useCMSStore = create<CMSState>((set) => ({
  heroLine1: "ПРЕВРАЩАЙ",
  heroLine2: "UGC",
  heroLine3: "В ЧИСТУЮ",
  heroLine4: "ПРИБЫЛЬ",
  heroDescription: "Свяжитесь с топовыми креаторами. Запускайте нативные кампании в TikTok, Reels и Shorts без передачи видеофайлов. Платите только за результат.",
  howItWorksTitle: "Как это работает",
  howItWorksSteps: [
    { title: "Выберите формат", description: "UGC обзор или интеграция баннера в готовый контент креатора." },
    { title: "Создайте оффер", description: "Опишите задачу, укажите бюджет и требования к аудитории." },
    { title: "Получите контент", description: "Креаторы снимают и публикуют видео на своих каналах." },
    { title: "Оплатите результат", description: "Средства списываются только после успешной публикации." }
  ],
  testimonialsTitle: "Отзывы клиентов",
  testimonials: [],
  faqTitle: "Часто задаваемые вопросы",
  faqItems: [
    { question: "Как происходит оплата?", answer: "Мы используем безопасную сделку. В итоговую стоимость для бренда уже включены сервис ADROP и безопасная сделка, а креатор получает согласованную выплату после публикации и проверки результата." },
    { question: "С каким бюджетом можно стартовать?", answer: "Минимальный бюджет кампании на ADROP — $100. Ниже этого порога оффер не публикуется: так креаторы видят рабочую задачу, а бренд получает более живые отклики и чище тестирует связки." },
    { question: "Какие вертикали вы поддерживаете?", answer: "Мы работаем с Crypto, Betting, Gambling, Dating и Nutra — теми вертикалями, где особенно важны скорость запуска и нативный UGC-контент." },
    { question: "Можно ли получить исходники видео?", answer: "По умолчанию креаторы публикуют видео на своих каналах. Выкуп прав на исходники обсуждается индивидуально." }
  ],
  updateField: (field, value) => set((state) => ({ ...state, [field]: value })),
}));

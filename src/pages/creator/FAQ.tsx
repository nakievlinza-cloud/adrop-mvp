import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Mail, HelpCircle } from "lucide-react";

const faqData = [
  {
    question: "Как начать работать на платформе?",
    answer: "После регистрации заполните свой профиль, добавьте портфолио и укажите свои специализации. Затем просмотрите доступные офферы в разделе 'Офферы' и откликнитесь на те, которые вам интересны."
  },
  {
    question: "Как я получаю оплату?",
    answer: "Оплата производится после завершения работы и утверждения результата заказчиком. Вы можете запросить вывод средств на свой USDT TRC20 кошелек в любой момент через меню профиля."
  },
  {
    question: "Как откликнуться на оффер?",
    answer: "Перейдите в раздел 'Офферы', выберите интересующий вас оффер и нажмите кнопку 'Откликнуться'. Укажите свою цену и комментарий, почему вы подходите для этого задания."
  },
  {
    question: "Что такое реферальная программа?",
    answer: "Реферальная программа позволяет вам зарабатывать, приглашая новых креаторов или заказчиков на платформу. Вы получаете процент от их первых транзакций."
  },
  {
    question: "Как изменить информацию в профиле?",
    answer: "Перейдите на страницу 'Мой профиль' и нажмите кнопку 'Редактировать'. Вы можете изменить имя, описание, страну, добавить портфолио и обновить статистику аудитории."
  },
  {
    question: "Что делать, если заказчик не одобряет работу?",
    answer: "Сначала попробуйте связаться с заказчиком через чат и уточнить требования. Если не можете договориться, обратитесь в техническую поддержку для решения спора."
  },
  {
    question: "Могу ли я работать с несколькими заказчиками одновременно?",
    answer: "Да, вы можете работать с несколькими заказчиками и офферами одновременно. Главное - успевать выполнять все заказы в качественной срок."
  },
  {
    question: "Как удалить свой аккаунт?",
    answer: "Для удаления аккаунта обратитесь в техническую поддержку через email info@adrop.com. Мы удалим ваш аккаунт в течение 7 дней."
  }
];

export function CreatorFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-ugc-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8 text-ugc-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold mb-2">Вопросы и ответы</h1>
        <p className="text-foreground/60">
          Часто задаваемые вопросы о работе на платформе
        </p>
      </div>

      {/* FAQ List */}
      <div className="space-y-4 mb-12">
        {faqData.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-white/10 rounded-2xl overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
              <span className="font-medium pr-4">{faq.question}</span>
              <motion.div
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-foreground/60 flex-shrink-0" />
              </motion.div>
            </button>
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-4 pt-0">
                    <p className="text-foreground/70 leading-relaxed">{faq.answer}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Contact Section */}
      <div className="bg-gradient-to-r from-ugc-primary/10 to-clip-primary/10 border border-white/10 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 text-ugc-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Не нашли ответ на свой вопрос?</h2>
        <p className="text-foreground/60 mb-6">
          Напишите нам, и мы поможем вам решить любую проблему
        </p>
        <a
          href="mailto:info@adrop.com"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ugc-primary hover:bg-ugc-primary/90 text-white rounded-xl font-bold transition-all"
        >
          <Mail className="w-4 h-4" />
          info@adrop.com
        </a>
      </div>
    </div>
  );
}

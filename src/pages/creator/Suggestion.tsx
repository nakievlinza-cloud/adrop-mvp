import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Lightbulb, CheckCircle2, AlertCircle } from "lucide-react";

export function CreatorSuggestion() {
  const [formData, setFormData] = useState({
    subject: "",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.subject.trim() || !formData.message.trim()) {
      setError("Пожалуйста, заполните все поля");
      return;
    }

    setSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setSubmitted(true);
      setSubmitting(false);
      setFormData({ subject: "", message: "" });
    }, 1500);
  };

  const suggestionCategories = [
    { name: "Улучшение платформы", desc: "Идеи по улучшению функционала" },
    { name: "Новые функции", desc: "Предложения по новым возможностям" },
    { name: "Баги и ошибки", desc: "Сообщить о найденных проблемах" },
    { name: "Партнёрство", desc: "Предложения по сотрудничеству" },
    { name: "Другое", desc: "Любые другие предложения" },
  ];

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-ugc-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lightbulb className="w-8 h-8 text-ugc-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold mb-2">Предложение руководству</h1>
        <p className="text-foreground/60">
          Ваше мнение важно для нас. Поделитесь идеями и предложениями
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Categories */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-white/10 rounded-2xl p-6 sticky top-24"
          >
            <h2 className="font-bold mb-4">Категории</h2>
            <div className="space-y-2">
              {suggestionCategories.map((category, index) => (
                <button
                  key={index}
                  onClick={() => setFormData({ ...formData, subject: category.name })}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="font-medium text-sm">{category.name}</div>
                  <div className="text-xs text-foreground/50">{category.desc}</div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-white/10 rounded-2xl p-8"
          >
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Спасибо за ваше предложение!</h2>
                <p className="text-foreground/60 mb-6">
                  Мы внимательно изучим его и рассмотрим возможность внедрения
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors"
                >
                  Отправить ещё предложение
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-6">Отправить предложение</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Тема предложения
                    </label>
                    <select
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors appearance-none"
                    >
                      <option value="" disabled>Выберите категорию</option>
                      {suggestionCategories.map((category, index) => (
                        <option key={index} value={category.name}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Ваше предложение
                    </label>
                    <textarea
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={8}
                      className="w-full bg-background border border-white/10 rounded-xl p-4 focus:outline-none focus:border-ugc-primary transition-colors resize-none"
                      placeholder="Опишите вашу идею подробно. Чем больше информации вы предоставите, тем лучше мы сможем понять ваше предложение..."
                    />
                    <p className="text-xs text-foreground/50 mt-2">
                      Минимум 10 символов
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-sm text-foreground/60">
                      💡 <strong>Совет:</strong> Конструктивные предложения с подробным описанием помогают нам быстрее внедрять улучшения. Будьте конкретны!
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !formData.subject || !formData.message || formData.message.length < 10}
                    className="w-full h-12 bg-ugc-primary hover:bg-ugc-primary/90 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>Отправка...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Отправить предложение
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 bg-gradient-to-r from-ugc-primary/10 to-clip-primary/10 border border-white/10 rounded-xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-ugc-primary" />
          </div>
          <div>
            <h3 className="font-bold mb-1">Как мы обрабатываем предложения?</h3>
            <p className="text-sm text-foreground/60">
              Все предложения внимательно изучаются нашей командой. Лучшие идеи внедряются в платформу, а авторы получают бонусы и привилегии.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

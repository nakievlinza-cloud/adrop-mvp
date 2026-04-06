import { useState } from "react";
import { motion } from "framer-motion";
import { Send, HeadphonesIcon, CheckCircle2, Mail, MessageSquare } from "lucide-react";

export function CreatorSupport() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setSubmitted(true);
      setSubmitting(false);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  const supportTopics = [
    { icon: MessageSquare, title: "Проблемы с заказами", desc: "Вопросы по офферам и оплате" },
    { icon: Mail, title: "Технические проблемы", desc: "Ошибки и баги платформы" },
    { icon: HeadphonesIcon, title: "Вопросы по профилю", desc: "Настройки и верификация" },
  ];

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-ugc-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <HeadphonesIcon className="w-8 h-8 text-ugc-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold mb-2">Техническая поддержка</h1>
        <p className="text-foreground/60">
          Мы всегда готовы помочь вам решить любую проблему
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Options */}
        <div className="lg:col-span-1 space-y-4">
          {supportTopics.map((topic, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                  <topic.icon className="w-5 h-5 text-ugc-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">{topic.title}</h3>
                  <p className="text-sm text-foreground/60">{topic.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-ugc-primary/10 to-clip-primary/10 border border-white/10 rounded-2xl p-5"
          >
            <h3 className="font-medium mb-2">Email поддержка</h3>
            <a
              href="mailto:info@adrop.com"
              className="text-ugc-primary hover:underline text-sm"
            >
              info@adrop.com
            </a>
            <p className="text-xs text-foreground/50 mt-2">
              Ответ в течение 24 часов
            </p>
          </motion.div>
        </div>

        {/* Contact Form */}
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
                <h2 className="text-2xl font-bold mb-2">Сообщение отправлено!</h2>
                <p className="text-foreground/60 mb-6">
                  Мы ответим вам в ближайшее время на указанный email
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors"
                >
                  Отправить еще сообщение
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-6">Напишите нам</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Ваше имя
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors"
                        placeholder="Иван Иванов"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors"
                        placeholder="example@mail.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Тема обращения
                    </label>
                    <select
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors appearance-none"
                    >
                      <option value="" disabled>Выберите тему</option>
                      <option value="order">Проблема с заказом</option>
                      <option value="payment">Вопрос по оплате</option>
                      <option value="technical">Техническая проблема</option>
                      <option value="profile">Вопрос по профилю</option>
                      <option value="other">Другое</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Сообщение
                    </label>
                    <textarea
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={6}
                      className="w-full bg-background border border-white/10 rounded-xl p-4 focus:outline-none focus:border-ugc-primary transition-colors resize-none"
                      placeholder="Опишите вашу проблему подробно..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 bg-ugc-primary hover:bg-ugc-primary/90 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>Отправка...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Отправить сообщение
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

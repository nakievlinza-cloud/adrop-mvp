import React, { useState } from "react";
import { useCMSStore } from "../../store/cmsStore";
import { Save, Plus, Trash2, LayoutDashboard } from "lucide-react";

export function AdminDashboard() {
  const store = useCMSStore();
  const [activeTab, setActiveTab] = useState<"hero" | "howItWorks" | "testimonials" | "faq">("hero");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Изменения успешно сохранены и применены на сайте!");
  };

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Панель управления (CMS)</h1>
          <p className="text-foreground/60">Редактируйте контент на главной странице в реальном времени.</p>
        </div>
        <button 
          onClick={handleSave}
          className="h-10 px-6 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors font-medium"
        >
          <Save className="w-4 h-4" /> Сохранить
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2 shrink-0">
          {[
            { id: "hero", label: "Главный экран" },
            { id: "howItWorks", label: "Как это работает" },
            { id: "testimonials", label: "Отзывы" },
            { id: "faq", label: "FAQ" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${
                activeTab === tab.id 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "hover:bg-white/5 text-foreground/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-card border border-white/5 rounded-2xl p-6">
          <form onSubmit={handleSave} className="space-y-6">
            
            {activeTab === "hero" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Главный экран</h2>
                <div>
                  <label className="block text-sm font-medium mb-2">Строка 1 (Белая)</label>
                  <input 
                    type="text" 
                    value={store.heroLine1}
                    onChange={(e) => store.updateField("heroLine1", e.target.value)}
                    className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Строка 2 (Цветная)</label>
                  <input 
                    type="text" 
                    value={store.heroLine2}
                    onChange={(e) => store.updateField("heroLine2", e.target.value)}
                    className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Строка 3 (Белая)</label>
                  <input 
                    type="text" 
                    value={store.heroLine3}
                    onChange={(e) => store.updateField("heroLine3", e.target.value)}
                    className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Строка 4 (Градиент с линией)</label>
                  <input 
                    type="text" 
                    value={store.heroLine4}
                    onChange={(e) => store.updateField("heroLine4", e.target.value)}
                    className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Описание</label>
                  <textarea 
                    value={store.heroDescription}
                    onChange={(e) => store.updateField("heroDescription", e.target.value)}
                    className="w-full h-32 bg-background border border-white/10 rounded-xl p-4 focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>
              </div>
            )}

            {activeTab === "howItWorks" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-4">Как это работает</h2>
                <div>
                  <label className="block text-sm font-medium mb-2">Заголовок секции</label>
                  <input 
                    type="text" 
                    value={store.howItWorksTitle}
                    onChange={(e) => store.updateField("howItWorksTitle", e.target.value)}
                    className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-4">
                  <label className="block text-sm font-medium">Шаги</label>
                  {store.howItWorksSteps.map((step, index) => (
                    <div key={index} className="p-4 border border-white/10 rounded-xl bg-background/50 space-y-4 relative">
                      <div className="absolute top-4 right-4 text-foreground/30 font-mono text-xl">0{index + 1}</div>
                      <div>
                        <label className="block text-xs text-foreground/60 mb-1">Название шага</label>
                        <input 
                          type="text" 
                          value={step.title}
                          onChange={(e) => {
                            const newSteps = [...store.howItWorksSteps];
                            newSteps[index].title = e.target.value;
                            store.updateField("howItWorksSteps", newSteps);
                          }}
                          className="w-full h-10 bg-background border border-white/10 rounded-lg px-3 focus:outline-none focus:border-primary transition-colors text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-foreground/60 mb-1">Описание</label>
                        <textarea 
                          value={step.description}
                          onChange={(e) => {
                            const newSteps = [...store.howItWorksSteps];
                            newSteps[index].description = e.target.value;
                            store.updateField("howItWorksSteps", newSteps);
                          }}
                          className="w-full h-20 bg-background border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary transition-colors text-sm resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "testimonials" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-4">Отзывы</h2>
                <div>
                  <label className="block text-sm font-medium mb-2">Заголовок секции</label>
                  <input 
                    type="text" 
                    value={store.testimonialsTitle}
                    onChange={(e) => store.updateField("testimonialsTitle", e.target.value)}
                    className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-4">
                  {store.testimonials.map((item, index) => (
                    <div key={index} className="p-4 border border-white/10 rounded-xl bg-background/50 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-foreground/60 mb-1">Имя</label>
                          <input 
                            type="text" 
                            value={item.name}
                            onChange={(e) => {
                              const newItems = [...store.testimonials];
                              newItems[index].name = e.target.value;
                              store.updateField("testimonials", newItems);
                            }}
                            className="w-full h-10 bg-background border border-white/10 rounded-lg px-3 focus:outline-none focus:border-primary text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-foreground/60 mb-1">Должность</label>
                          <input 
                            type="text" 
                            value={item.role}
                            onChange={(e) => {
                              const newItems = [...store.testimonials];
                              newItems[index].role = e.target.value;
                              store.updateField("testimonials", newItems);
                            }}
                            className="w-full h-10 bg-background border border-white/10 rounded-lg px-3 focus:outline-none focus:border-primary text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-foreground/60 mb-1">Текст отзыва</label>
                        <textarea 
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...store.testimonials];
                            newItems[index].text = e.target.value;
                            store.updateField("testimonials", newItems);
                          }}
                          className="w-full h-20 bg-background border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary text-sm resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "faq" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-4">FAQ</h2>
                <div>
                  <label className="block text-sm font-medium mb-2">Заголовок секции</label>
                  <input 
                    type="text" 
                    value={store.faqTitle}
                    onChange={(e) => store.updateField("faqTitle", e.target.value)}
                    className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-4">
                  {store.faqItems.map((item, index) => (
                    <div key={index} className="p-4 border border-white/10 rounded-xl bg-background/50 space-y-4">
                      <div>
                        <label className="block text-xs text-foreground/60 mb-1">Вопрос</label>
                        <input 
                          type="text" 
                          value={item.question}
                          onChange={(e) => {
                            const newItems = [...store.faqItems];
                            newItems[index].question = e.target.value;
                            store.updateField("faqItems", newItems);
                          }}
                          className="w-full h-10 bg-background border border-white/10 rounded-lg px-3 focus:outline-none focus:border-primary text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-foreground/60 mb-1">Ответ</label>
                        <textarea 
                          value={item.answer}
                          onChange={(e) => {
                            const newItems = [...store.faqItems];
                            newItems[index].answer = e.target.value;
                            store.updateField("faqItems", newItems);
                          }}
                          className="w-full h-20 bg-background border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary text-sm resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}

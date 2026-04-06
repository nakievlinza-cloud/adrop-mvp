import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, Eye, Users, DollarSign, Activity, X, TrendingUp, MousePointerClick } from "lucide-react";
import { ContentTypeBadge } from "../../components/ContentTypeBadge";
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";

export function CustomerOffers() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [offers, setOffers] = useState<any[]>([]);
  
  const [statsOffer, setStatsOffer] = useState<any | null>(null);
  const [editOffer, setEditOffer] = useState<any | null>(null);
  const [deleteOffer, setDeleteOffer] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "offers"), where("customerId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const offersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOffers(offersData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async () => {
    if (deleteOffer) {
      try {
        await deleteDoc(doc(db, "offers", deleteOffer.id));
        setDeleteOffer(null);
      } catch (error) {
        console.error("Error deleting offer:", error);
      }
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editOffer) {
      try {
        const offerRef = doc(db, "offers", editOffer.id);
        await updateDoc(offerRef, {
          title: editOffer.title,
          type: editOffer.type,
          platforms: editOffer.platforms,
          description: editOffer.description,
          tzLink: editOffer.tzLink,
          references: editOffer.references,
          budget: editOffer.budget,
          slots: editOffer.slots
        });
        setEditOffer(null);
      } catch (error) {
        console.error("Error updating offer:", error);
      }
    }
  };

  const filteredOffers = offers.filter(offer => 
    offer.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Мои офферы</h1>
          <p className="text-foreground/60">Управляйте вашими рекламными кампаниями.</p>
        </div>
        <Link href="/customer/create-offer">
          <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/25">
            <Plus className="w-5 h-5" /> Создать оффер
          </button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
          <input 
            type="text" 
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-card border border-white/10 rounded-lg pl-10 pr-4 focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>
        <button className="h-10 px-4 bg-card border border-white/10 rounded-lg flex items-center gap-2 hover:bg-white/5 transition-colors text-sm font-medium">
          <Filter className="w-4 h-4" /> Фильтры
        </button>
      </div>

      <div className="bg-card border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 font-medium text-sm text-foreground/60">Оффер</th>
                <th className="p-4 font-medium text-sm text-foreground/60">Статус</th>
                <th className="p-4 font-medium text-sm text-foreground/60">Бюджет / Потрачено</th>
                <th className="p-4 font-medium text-sm text-foreground/60">Места</th>
                <th className="p-4 font-medium text-sm text-foreground/60">Охват</th>
                <th className="p-4 font-medium text-sm text-foreground/60 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.map((offer) => (
                <tr key={offer.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold">{offer.title}</span>
                      <div className="flex items-center gap-2">
                        <ContentTypeBadge type={offer.type as any} />
                        <span className="text-xs text-foreground/50">{offer.date}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      offer.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${offer.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                      {offer.status === 'active' ? 'Активен' : 'Черновик'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-mono font-bold">${offer.budget || offer.price || 0}</span>
                      <span className="text-xs text-foreground/50">Потрачено: ${offer.spent || 0}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-foreground/50" />
                      <span className="font-medium">{offer.slotsTaken || 0} / {offer.slots || 1}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-foreground/50" />
                      <span className="font-medium">{offer.views || 0}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setStatsOffer(offer)}
                        className="p-2 text-foreground/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Статистика"
                      >
                        <Activity className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setEditOffer(offer)}
                        className="p-2 text-foreground/60 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteOffer(offer)}
                        className="p-2 text-foreground/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Modal */}
      <AnimatePresence>
        {statsOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStatsOffer(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#141414] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div>
                  <h2 className="text-xl font-display font-bold">Статистика оффера</h2>
                  <p className="text-sm text-foreground/60">{statsOffer.title}</p>
                </div>
                <button 
                  onClick={() => setStatsOffer(null)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-foreground/60 mb-2">
                      <Eye className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Охват</span>
                    </div>
                    <div className="text-2xl font-bold">{statsOffer.views || 0}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-foreground/60 mb-2">
                      <MousePointerClick className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Клики</span>
                    </div>
                    <div className="text-2xl font-bold">{statsOffer.clicks || 0}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-foreground/60 mb-2">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">CTR</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                      {statsOffer.views && statsOffer.views > 0
                        ? `${((statsOffer.clicks || 0) / statsOffer.views * 100).toFixed(1)}%`
                        : '0%'}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-foreground/60 mb-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Потрачено</span>
                    </div>
                    <div className="text-2xl font-bold">${statsOffer.spent || 0}</div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center h-48">
                  <Activity className="w-8 h-8 text-foreground/20 mb-2" />
                  <p className="text-foreground/50 text-sm">График активности будет доступен позже</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditOffer(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#141414] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                <h2 className="text-xl font-display font-bold">Редактировать оффер</h2>
                <button 
                  onClick={() => setEditOffer(null)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <form onSubmit={handleEditSave} className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Название оффера</label>
                    <input 
                      type="text" 
                      value={editOffer.title}
                      onChange={(e) => setEditOffer({...editOffer, title: e.target.value})}
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Формат контента</label>
                    <select 
                      value={editOffer.type}
                      onChange={(e) => setEditOffer({...editOffer, type: e.target.value})}
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors appearance-none"
                    >
                      <option value="ugc">UGC (Пользовательский контент)</option>
                      <option value="clip">Короткий ролик (Shorts/Reels)</option>
                      <option value="integration">Интеграция в видео</option>
                      <option value="stream">Стрим</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">Платформы</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'tiktok', label: 'TikTok' },
                      { id: 'reels', label: 'Instagram Reels' },
                      { id: 'shorts', label: 'YouTube Shorts' }
                    ].map(platform => {
                      const isSelected = editOffer.platforms?.includes(platform.id);
                      return (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => {
                            const newPlatforms = isSelected 
                              ? editOffer.platforms.filter((p: string) => p !== platform.id)
                              : [...(editOffer.platforms || []), platform.id];
                            setEditOffer({...editOffer, platforms: newPlatforms});
                          }}
                          className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                            isSelected 
                              ? 'bg-primary/20 border-primary text-primary' 
                              : 'bg-white/5 border-white/10 text-foreground/60 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {platform.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Подробное описание</label>
                  <textarea 
                    value={editOffer.description}
                    onChange={(e) => setEditOffer({...editOffer, description: e.target.value})}
                    className="w-full h-32 bg-background border border-white/10 rounded-xl p-4 focus:outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Опишите задачу максимально подробно..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Ссылка на ТЗ (Google Docs, Notion)</label>
                    <input 
                      type="url" 
                      value={editOffer.tzLink || ''}
                      onChange={(e) => setEditOffer({...editOffer, tzLink: e.target.value})}
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Референсы (примеры)</label>
                    <textarea 
                      value={editOffer.references || ''}
                      onChange={(e) => setEditOffer({...editOffer, references: e.target.value})}
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors resize-none"
                      placeholder="Ссылки на примеры..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Бюджет ($)</label>
                    <input 
                      type="number" 
                      value={editOffer.budget}
                      onChange={(e) => setEditOffer({...editOffer, budget: Number(e.target.value)})}
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Количество мест</label>
                    <input 
                      type="number" 
                      value={editOffer.slots}
                      onChange={(e) => setEditOffer({...editOffer, slots: Number(e.target.value)})}
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-6 border-t border-white/10">
                  <button 
                    type="button"
                    onClick={() => setEditOffer(null)}
                    className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-colors shadow-lg shadow-primary/20"
                  >
                    Сохранить изменения
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteOffer(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[#141414] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-display font-bold mb-2">Удалить оффер?</h2>
              <p className="text-foreground/60 text-sm mb-6">
                Вы уверены, что хотите удалить оффер <span className="text-white font-medium">"{deleteOffer.title}"</span>? Это действие нельзя отменить.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteOffer(null)}
                  className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                >
                  Отмена
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft01Icon,
  Attachment01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  FileAttachmentIcon,
  Image01Icon,
  Link01Icon,
  Message01Icon,
  MoreVerticalCircle01Icon,
  Search01Icon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import { getOrCreateChat } from "../../lib/chats";
import { AppIcon } from "../../components/ui/icon";
import { getAvatarSrc } from "../../lib/avatar";

type AttachmentType = "script" | "video" | "image";

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
  isSystem?: boolean;
  offerTitle?: string;
  attachment?: {
    type: AttachmentType;
    name: string;
    url: string;
  } | null;
}

interface Chat {
  id: string;
  name: string;
  avatar: string;
  unread: number;
  customerId: string;
  creatorId: string;
  offerId?: string | null;
  updatedAt?: any;
  lastMessage?: string;
}

function formatChatTime(value: any) {
  if (!value?.toDate) return "";

  return value.toDate().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAttachmentType(file: File): AttachmentType {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  return "script";
}

export function CustomerMessages() {
  const { user } = useAuthStore();
  const [location] = useLocation();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPlatform, setLinkPlatform] = useState<"youtube" | "tiktok" | "instagram" | "other">("youtube");
  const [isResolvingTargetChat, setIsResolvingTargetChat] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendError, setSendError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const resolvedTargetRef = useRef("");

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(collection(db, "chats"), where("customerId", "==", user.uid));
    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatsData = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();

          let creatorName = "Креатор";
          let creatorAvatar = getAvatarSrc(null, creatorName, "creator");

          try {
            const creatorDoc = await getDoc(doc(db, "users", data.creatorId));
            if (creatorDoc.exists()) {
              creatorName = creatorDoc.data().name || creatorName;
              creatorAvatar = getAvatarSrc(
                creatorDoc.data().avatarUrl || creatorDoc.data().avatar,
                creatorName,
                "creator",
              );
            }
          } catch (error) {
            console.error("Error fetching creator:", error);
          }

          return {
            id: docSnapshot.id,
            ...data,
            name: creatorName,
            avatar: creatorAvatar,
            unread: Number(data.unread || 0),
          } as Chat;
        }),
      );

      chatsData.sort((left, right) => {
        const leftTime = typeof left.updatedAt?.toMillis === "function" ? left.updatedAt.toMillis() : 0;
        const rightTime = typeof right.updatedAt?.toMillis === "function" ? right.updatedAt.toMillis() : 0;
        return rightTime - leftTime;
      });

      setChats(chatsData);
      setActiveChatId((previous) => previous || chatsData[0]?.id || null);
    });

    return () => unsubscribe();
  }, [user]);

  const resolveTargetChat = useCallback(async () => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const chatIdFromUrl = params.get("chat");
    const creatorIdFromUrl = params.get("creator");
    const offerIdFromUrl = params.get("offer");
    const resolutionKey = `${user.uid}:${chatIdFromUrl || ""}:${creatorIdFromUrl || ""}:${offerIdFromUrl || ""}`;

    if (resolvedTargetRef.current === resolutionKey) {
      return;
    }

    if (chatIdFromUrl) {
      resolvedTargetRef.current = resolutionKey;
      setActiveChatId(chatIdFromUrl);
      return;
    }

    if (!creatorIdFromUrl) {
      return;
    }

    resolvedTargetRef.current = resolutionKey;
    setIsResolvingTargetChat(true);

    try {
      const targetChat = await getOrCreateChat({
        customerId: user.uid,
        creatorId: creatorIdFromUrl,
        offerId: offerIdFromUrl,
        lastMessage: "Диалог открыт",
        welcomeText: "Диалог открыт. Напишите креатору первое сообщение.",
      });

      setActiveChatId(targetChat.id);
      window.history.replaceState({}, "", `/customer/messages?chat=${targetChat.id}`);
    } catch (error) {
      console.error("Error resolving target chat:", error);
    } finally {
      setIsResolvingTargetChat(false);
    }
  }, [user]);

  useEffect(() => {
    void resolveTargetChat();
  }, [location, resolveTargetChat]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    const messagesQuery = query(collection(db, "chats", activeChatId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const nextMessages = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      })) as Message[];

      setMessages(nextMessages);
      setSendError("");
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const filteredChats = useMemo(() => {
    const queryValue = searchQuery.trim().toLowerCase();

    if (!queryValue) {
      return chats;
    }

    return chats.filter((chat) => {
      return [chat.name, chat.lastMessage, chat.offerId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(queryValue));
    });
  }, [chats, searchQuery]);

  const activeChat = filteredChats.find((chat) => chat.id === activeChatId) || chats.find((chat) => chat.id === activeChatId) || null;
  const showChatPanel = Boolean(activeChat);

  const handleOpenChat = (chatId: string) => {
    setActiveChatId(chatId);
    setShowMenu(false);
    setSendError("");
    window.history.replaceState({}, "", `/customer/messages?chat=${chatId}`);
  };

  const handleSendMessage = async (event?: React.FormEvent, attachment?: Message["attachment"]) => {
    event?.preventDefault();

    if ((!newMessage.trim() && !attachment) || !activeChatId || !user || isSendingMessage) {
      return;
    }

    setIsSendingMessage(true);
    setSendError("");

    try {
      const text = newMessage.trim();
      await addDoc(collection(db, "chats", activeChatId, "messages"), {
        text,
        senderId: user.uid,
        attachment: attachment || null,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "chats", activeChatId), {
        lastMessage: attachment ? attachment.name : text || "Вложение",
        updatedAt: serverTimestamp(),
      });

      setNewMessage("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setSendError("Не удалось отправить сообщение. Попробуйте ещё раз.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const attachmentType = getAttachmentType(file);
    const reader = new FileReader();
    reader.onloadend = async () => {
      await handleSendMessage(undefined, {
        type: attachmentType,
        name: file.name,
        url: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleLinkSend = async () => {
    if (!linkUrl.trim()) return;

    const platformNames = {
      youtube: "YouTube",
      tiktok: "TikTok",
      instagram: "Instagram",
      other: "Ссылка",
    };

    await handleSendMessage(undefined, {
      type: "video",
      name: `${platformNames[linkPlatform]}: ${linkUrl}`,
      url: linkUrl,
    });

    setLinkUrl("");
    setLinkPlatform("youtube");
    setShowLinkModal(false);
  };

  const handleClearChat = async () => {
    if (!activeChatId) return;

    try {
      const messagesSnapshot = await getDocs(collection(db, "chats", activeChatId, "messages"));
      await Promise.all(messagesSnapshot.docs.map((messageDoc) => deleteDoc(messageDoc.ref)));

      await updateDoc(doc(db, "chats", activeChatId), {
        lastMessage: "Чат очищен",
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error clearing chat:", error);
      setSendError("Не удалось очистить чат. Попробуйте позже.");
    }

    setShowMenu(false);
  };

  return (
    <div className="w-full px-4 py-6 sm:px-8 lg:px-12 2xl:px-16 lg:py-8 min-h-[calc(100vh-5rem)]">
      <div className="bg-card border border-white/5 rounded-3xl overflow-hidden flex min-h-[calc(100vh-9rem)] shadow-2xl">
        <div className={`w-full lg:w-[360px] border-r border-white/5 bg-background/50 flex-col ${showChatPanel ? "hidden lg:flex" : "flex"}`}>
          <div className="p-5 border-b border-white/5">
            <h2 className="text-2xl font-display font-bold mb-4">Сообщения</h2>
            <div className="relative">
              <AppIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск по чатам"
                className="w-full h-11 bg-card border border-white/10 rounded-xl pl-10 pr-4 focus:outline-none focus:border-clip-primary transition-colors text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => handleOpenChat(chat.id)}
                className={`w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 ${
                  activeChatId === chat.id ? "bg-white/5 border-l-2 border-l-clip-primary" : "border-l-2 border-l-transparent"
                }`}
              >
                <div className="relative shrink-0">
                  <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full object-cover" />
                  {chat.unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-clip-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                      {chat.unread}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="font-semibold truncate text-white">{chat.name}</span>
                    <span className="text-[11px] text-foreground/45 shrink-0">{formatChatTime(chat.updatedAt)}</span>
                  </div>
                  <p className="text-sm text-foreground/55 truncate">{chat.lastMessage || "Диалог открыт"}</p>
                </div>
              </button>
            ))}

            {!filteredChats.length && !isResolvingTargetChat && (
              <div className="p-6 text-sm text-foreground/50">Чатов пока нет. Откройте креатора и нажмите «Сообщение».</div>
            )}
          </div>
        </div>

        <div className={`min-w-0 flex-1 flex-col ${showChatPanel ? "flex" : "hidden lg:flex"}`}>
          {activeChat ? (
            <>
              <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4 bg-background/30">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveChatId(null)}
                    className="lg:hidden w-10 h-10 rounded-full border border-white/10 hover:bg-white/5 flex items-center justify-center shrink-0"
                  >
                    <AppIcon icon={ArrowLeft01Icon} size={18} />
                  </button>
                  <img src={activeChat.avatar} alt={activeChat.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">{activeChat.name}</h3>
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                      Диалог активен
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 relative shrink-0">
                  <button
                    onClick={() => setShowMenu((previous) => !previous)}
                    className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"
                  >
                    <AppIcon icon={MoreVerticalCircle01Icon} className="text-foreground/60" />
                  </button>

                  {showMenu && (
                    <div ref={menuRef} className="absolute top-12 right-0 bg-card border border-white/10 rounded-xl shadow-xl z-50 min-w-[220px]">
                      <button
                        onClick={handleClearChat}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left text-sm"
                      >
                        <AppIcon icon={Cancel01Icon} className="text-red-400" size={18} />
                        <span>Очистить переписку</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-transparent to-background/20">
                {messages.map((message) => {
                  const isMine = message.senderId === user?.uid;
                  const isSystem = message.senderId === "system" || message.isSystem;

                  if (isSystem) {
                    return (
                      <div key={message.id} className="flex justify-center">
                        <div className="inline-flex max-w-full items-center gap-2 px-4 py-2 bg-clip-primary/10 border border-clip-primary/20 rounded-full text-sm text-center">
                          <AppIcon icon={CheckmarkCircle02Icon} className="text-clip-primary shrink-0" size={16} />
                          <span className="text-clip-primary font-medium break-words">{message.text}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`w-full max-w-[88%] sm:max-w-[70%] p-4 ${
                          isMine
                            ? "bg-primary rounded-2xl rounded-tr-none text-white shadow-lg shadow-primary/20"
                            : "bg-white/5 border border-white/10 rounded-2xl rounded-tl-none text-foreground"
                        }`}
                      >
                        {message.text && <p className="text-sm leading-relaxed break-words">{message.text}</p>}

                        {message.attachment && (
                          <div className={`mt-3 p-3 rounded-xl flex items-center gap-3 ${isMine ? "bg-black/20" : "bg-black/40 border border-white/5"}`}>
                            {message.attachment.type === "script" && <AppIcon icon={FileAttachmentIcon} className="text-blue-400 shrink-0" size={26} />}
                            {message.attachment.type === "video" && <AppIcon icon={Link01Icon} className="text-red-400 shrink-0" size={26} />}
                            {message.attachment.type === "image" && <AppIcon icon={Image01Icon} className="text-emerald-400 shrink-0" size={26} />}
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <p className="text-sm font-medium truncate">{message.attachment.name}</p>
                              <a href={message.attachment.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 hover:underline">
                                Открыть вложение
                              </a>
                            </div>
                          </div>
                        )}

                        <span className={`text-[10px] mt-2 block ${isMine ? "text-white/60 text-right" : "text-foreground/40"}`}>
                          {formatChatTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-white/5 bg-background/30">
                {sendError && (
                  <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {sendError}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-end gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors text-foreground/60 shrink-0"
                    title="Прикрепить файл"
                  >
                    <AppIcon icon={Attachment01Icon} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx"
                  />

                  <button
                    type="button"
                    onClick={() => setShowLinkModal(true)}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors text-foreground/60 shrink-0"
                    title="Прикрепить ссылку"
                  >
                    <AppIcon icon={Link01Icon} />
                  </button>

                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={(event) => setNewMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      placeholder="Написать сообщение..."
                      rows={1}
                      className="w-full min-h-[48px] max-h-32 resize-none bg-card border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={(!newMessage.trim() && !isSendingMessage) || isSendingMessage}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors text-white shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <AppIcon icon={SentIcon} size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-foreground/50 gap-4 p-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                <AppIcon icon={Message01Icon} className="opacity-70" size={30} />
              </div>
              <p>{isResolvingTargetChat ? "Открываю диалог..." : "Выберите чат для начала общения"}</p>
            </div>
          )}
        </div>

        {showLinkModal && (
          <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={() => setShowLinkModal(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1.5rem)] max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-bold">Прикрепить ссылку</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Платформа</label>
                  <select
                    value={linkPlatform}
                    onChange={(event) => setLinkPlatform(event.target.value as typeof linkPlatform)}
                    className="w-full h-12 bg-card border border-white/10 rounded-xl px-4 focus:outline-none focus:border-clip-primary transition-colors text-sm"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="instagram">Instagram</option>
                    <option value="other">Другое</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Ссылка</label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://..."
                    className="w-full h-12 bg-card border border-white/10 rounded-xl px-4 focus:outline-none focus:border-clip-primary transition-colors font-mono text-sm"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowLinkModal(false);
                      setLinkUrl("");
                    }}
                    className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleLinkSend}
                    disabled={!linkUrl.trim() || isSendingMessage}
                    className="flex-1 h-12 bg-clip-primary hover:bg-clip-primary/90 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-clip-primary/20"
                  >
                    Прикрепить
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

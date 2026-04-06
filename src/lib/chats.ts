import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

export interface ChatParticipantParams {
  customerId: string;
  creatorId: string;
  offerId?: string | null;
}

interface GetOrCreateChatParams extends ChatParticipantParams {
  lastMessage?: string;
  welcomeText?: string;
}

function matchesOffer(chatOfferId: unknown, targetOfferId?: string | null) {
  const normalizedChatOfferId =
    typeof chatOfferId === "string" && chatOfferId.trim() ? chatOfferId : null;
  const normalizedTargetOfferId =
    typeof targetOfferId === "string" && targetOfferId.trim() ? targetOfferId : null;

  return normalizedChatOfferId === normalizedTargetOfferId;
}

export async function findChatsByParticipants({
  customerId,
  creatorId,
}: ChatParticipantParams) {
  const snapshot = await getDocs(
    query(collection(db, "chats"), where("customerId", "==", customerId)),
  );

  return snapshot.docs.filter((chatDoc) => {
    const data = chatDoc.data();
    return data.creatorId === creatorId;
  });
}

export async function getOrCreateChat({
  customerId,
  creatorId,
  offerId = null,
  lastMessage = "Диалог открыт",
  welcomeText,
}: GetOrCreateChatParams) {
  const existingChats = await findChatsByParticipants({ customerId, creatorId, offerId });

  const exactChat =
    existingChats.find((chatDoc) => matchesOffer(chatDoc.data().offerId, offerId)) ||
    null;

  const fallbackChat =
    !offerId
      ? existingChats.find((chatDoc) => !chatDoc.data().offerId) || existingChats[0] || null
      : existingChats[0] || null;

  const matchedChat = exactChat || fallbackChat;
  if (matchedChat) {
    return { id: matchedChat.id, created: false };
  }

  const chatRef = await addDoc(collection(db, "chats"), {
    customerId,
    creatorId,
    offerId,
    participantIds: [customerId, creatorId],
    unread: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage,
  });

  if (welcomeText) {
    await addDoc(collection(db, "chats", chatRef.id, "messages"), {
      senderId: "system",
      text: welcomeText,
      isSystem: true,
      createdAt: serverTimestamp(),
    });
  }

  return { id: chatRef.id, created: true };
}

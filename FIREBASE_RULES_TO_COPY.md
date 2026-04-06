# 🔥 Firebase Firestore Rules

## Как применить:

1. Открой https://console.firebase.google.com/
2. Выбери проект **gen-lang-client-0169485869**
3. В меню слева: **Firestore Database**
4. Вкладка **Rules**
5. **Удали всё** и вставь код ниже
6. Нажми **Publish** (Опубликовать)

---

## Правила для копирования:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // =================== USERS ===================
    match /users/{userId} {
      allow read: if true;
      allow write: if isAuthenticated();
    }

    // =================== OFFERS ===================
    match /offers/{offerId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.customerId);
      allow delete: if isOwner(resource.data.customerId);
    }

    // =================== APPLICATIONS ===================
    match /applications/{applicationId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isOwner(resource.data.creatorId) || isOwner(resource.data.customerId);
    }

    // =================== NOTIFICATIONS ===================
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && resource.data.recipientId == request.auth.uid;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && resource.data.recipientId == request.auth.uid;
      allow delete: if isAuthenticated() && resource.data.recipientId == request.auth.uid;
    }

    // =================== CHATS ===================
    match /chats/{chatId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
    }

    // =================== CHAT MESSAGES ===================
    match /chats/{chatId}/messages/{messageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
    }

  }
}
```

---

## ✅ После публикации:

1. **Перезагрузи страницу** приложения (F5)
2. **Открой** http://localhost:3000/debug-notifications
3. **Отправь приглашение** креатору
4. **Проверь** — должно появиться уведомление

---

## 🐛 Если не работает:

Открой консоль браузера (F12) и посмотри ошибки.

# 🔧 Firebase Rules Setup

## ❌ Проблема: `permission-denied` в Firestore

Уведомления не работают потому что правила безопасности Firestore не настроены!

## ✅ Как исправить:

### Шаг 1: Открой Firebase Console
1. Перейди на https://console.firebase.google.com/
2. Выбери свой проект
3. В меню слева выбери **"Firestore Database"**
4. Нажми на вкладку **"Rules"** (правила)

### Шаг 2: Замени правила на эти:

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

    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if isAuthenticated();
    }

    // Offers collection
    match /offers/{offerId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.customerId);
      allow delete: if isOwner(resource.data.customerId);
    }

    // Applications collection
    match /applications/{applicationId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isOwner(resource.data.creatorId) || isOwner(resource.data.customerId);
    }

    // Notifications collection - ВОТ ГЛАВНОЕ!
    match /notifications/{notificationId} {
      allow read: if isOwner(resource.data.recipientId);
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.recipientId);
      allow delete: if isOwner(resource.data.recipientId);
    }

    // Chats collection
    match /chats/{chatId} {
      allow read: if isAuthenticated() && (resource.data.customerId == request.auth.uid || resource.data.creatorId == request.auth.uid);
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (resource.data.customerId == request.auth.uid || resource.data.creatorId == request.auth.uid);
    }

    // Chat messages
    match /chats/{chatId}/messages/{messageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
    }

    // Portfolio collection
    match /portfolio/{portfolioId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.resource.data.creatorId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.creatorId);
    }

    // Orders collection
    match /orders/{orderId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
    }
  }
}
```

### Шаг 3: Опубликуй правила
1. Нажми кнопку **"Publish"** (Опубликовать)
2. Подожди 1-2 минуты пока правила применятся

### Шаг 4: Перезагрузи приложение
1. Обнови страницу (F5)
2. Попробуй снова отправить приглашение

## 🎯 После этого:

1. Уведомления будут создаваться
2. Debug страница покажет данные
3. Модалка у креатора будет работать

---

## Если не хочешь настраивать правила прямо сейчас:

**Временное решение** - используй **Test Mode** (тестовый режим):

1. В Firebase Console → Firestore → Rules
2. Выбери **"Test mode"** вместо **"Production mode"**
3. Установи время на **30 дней**
4. Опубликуй

**⚠️ Внимание:** Test mode открывает полный доступ к базе данных. Используй только для тестирования!

---

После настройки правил - всё заработает! 🚀

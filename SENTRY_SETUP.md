# Konfiguracja Sentry dla pełnego logowania

## 1. Zmienne środowiskowe

Upewnij się, że masz skonfigurowane w `.env`:

```env
# Sentry Configuration
SENTRY_DSN=https://a873cac765c17336bcd420c22a6dd13f@o4509576563326976.ingest.de.sentry.io/4509576593670224
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=1.0.0
```

## 2. Konfiguracja Sentry w projekcie

### Backend (już skonfigurowane)
- ✅ `server/utils/sentry.js` - inicjalizacja Sentry
- ✅ `server/index.js` - middleware Sentry
- ✅ `server/services/OpenAIService.js` - pełne logowanie

### Frontend (już skonfigurowane)
- ✅ `src/utils/sentry.ts` - inicjalizacja Sentry
- ✅ `src/main.tsx` - inicjalizacja przed renderowaniem
- ✅ `src/App.tsx` - Error Boundary

## 3. Sprawdź w Sentry Dashboard

### Gdzie znajdziesz logi:

1. **Issues** - błędy i wyjątki
2. **Performance** - transakcje i wydajność
3. **Releases** - wersje aplikacji
4. **Alerts** - powiadomienia

### Dla Messages (nowe logi OpenAI):

1. Idź do **Issues**
2. Filtruj po typie: **"Message"** zamiast **"Error"**
3. Szukaj wiadomości typu:
   - "OpenAI Request Started"
   - "OpenAI Response Received Successfully"
   - "OpenAI Request Failed"

## 4. Testowanie logowania

Uruchom aplikację i wykonaj rekomendację książek:

```bash
# Backend
npm run server

# Frontend
npm run dev
```

## 5. Sprawdź w konsoli

Powinieneś zobaczyć w konsoli backend:
```
✅ Sentry initialized for backend - Environment: development
```

W konsoli frontend:
```
✅ Sentry initialized for frontend - Environment: development
```

## 6. Debugowanie

Jeśli logi się nie pokazują:

### Sprawdź DSN:
```bash
curl -X POST 'https://a873cac765c17336bcd420c22a6dd13f@o4509576563326976.ingest.de.sentry.io/4509576593670224/store/' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Test message"}'
```

### Włącz debug mode:
W `server/utils/sentry.js` zmień:
```javascript
debug: true, // zawsze true dla testowania
```

### Sprawdź rate limiting:
Sentry może ograniczać liczbę eventów. Sprawdź w Settings > Quotas.

## 7. Filtrowanie w Sentry

Aby zobaczyć tylko logi OpenAI:

1. W **Issues** użyj filtra:
   ```
   message:"OpenAI*"
   ```

2. Lub filtruj po tagach:
   ```
   category:ai_service
   ```

## 8. Oczekiwane logi

Po wykonaniu rekomendacji powinieneś zobaczyć:

### Messages:
- "OpenAI Request Started: gpt-3.5-turbo"
- "OpenAI Response Received Successfully: gpt-3.5-turbo"

### Breadcrumbs:
- "OpenAI request started" z pełnym promptem
- "OpenAI request completed" z pełną odpowiedzią

### Context data:
- `fullPrompt` - cały prompt wysłany do OpenAI
- `fullResponse` - cała odpowiedź z OpenAI
- `usage` - statystyki użycia tokenów
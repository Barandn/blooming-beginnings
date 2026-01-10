# Lovable Cloud için Hazır Prompt

Aşağıdaki prompt'u Lovable'a yapıştırın:

---

```
Bu React + Vite projesini Lovable Cloud'da çalışır hale getir.

## YAPILACAKLAR:

### 1. Supabase Bağlantısı
Lovable'ın native Supabase entegrasyonunu kullan ve bağla.

### 2. Veritabanı Tabloları
`supabase/migrations/` klasöründeki SQL dosyalarını çalıştır. Önemli tablolar:
- users (wallet_address, verification_level)
- siwe_nonces (nonce, expires_at, consumed_at)
- game_scores (user_id, score, monthly_profit, leaderboard_period)
- barn_game_attempts (free_game_used, play_pass_expires_at, cooldown_ends_at)
- barn_game_purchases, payment_references, claim_transactions, daily_bonus_claims, sessions

### 3. Edge Functions
`supabase/functions/` klasöründeki Deno edge function'ları deploy et:
- auth (SIWE kimlik doğrulama)
- scores (skor gönderimi)
- leaderboard (sıralama)
- barn (Play Pass sistemi)
- claim (token claim)
- user (profil)

### 4. Environment Variables
Şunları ayarla:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET (min 32 karakter: `openssl rand -hex 32` ile üret)

### 5. API Routing
`/api/*` endpoint'lerini Supabase Edge Functions'a yönlendir:
- /api/auth/siwe/* -> auth function
- /api/scores/submit -> scores function
- /api/leaderboard -> leaderboard function
- /api/barn/* -> barn function
- /api/user/profile -> user function

### 6. Build & Deploy
Frontend Vite ile build edilir. shadcn/ui + Tailwind CSS kullanıyor.

## PROJE HAKKINDA:
- Kart eşleştirme oyunu (5x5 grid, 12 çift + bonus)
- World App MiniKit ile SIWE authentication
- Play Pass sistemi (1 WLD = 1 saat)
- Aylık leaderboard
- 90 saniye süre limiti, 100 coin ödül

Projeyi deploy et ve tüm API'lerin çalıştığını doğrula.
```

---

## EK BİLGİLER

Eğer Lovable manuel SQL ister, migration dosyasının tam yolu:
`supabase/migrations/20251231121053_473e933d-1920-4fa3-b53a-84c60138d730.sql`

JWT_SECRET oluşturmak için:
```bash
openssl rand -hex 32
```

Örnek: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

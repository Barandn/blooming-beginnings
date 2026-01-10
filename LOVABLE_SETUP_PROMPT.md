# Lovable Cloud Setup Prompt

Bu projeyi Lovable Cloud'da tam olarak çalışır hale getirmek için aşağıdaki prompt'u kullanın:

---

## PROMPT (Kopyala-Yapıştır):

```
Bu projeyi Lovable Cloud'da tam olarak çalışır hale getir. Aşağıdaki adımları takip et:

## 1. SUPABASE ENTEGRASYONU

Lovable'ın native Supabase entegrasyonunu kullan. Supabase projesini bağla ve aşağıdaki tabloları oluştur:

### Tablolar:

**users** tablosu:
- id: UUID (PK, default: gen_random_uuid())
- nullifier_hash: TEXT (UNIQUE, NOT NULL)
- wallet_address: VARCHAR(42) (NOT NULL)
- verification_level: VARCHAR(20) (default: 'orb')
- merkle_root: TEXT (nullable)
- is_active: BOOLEAN (default: true)
- daily_streak_count: INTEGER (default: 0)
- last_daily_claim_date: DATE (nullable)
- created_at: TIMESTAMPTZ (default: now())
- updated_at: TIMESTAMPTZ (default: now())
- last_login_at: TIMESTAMPTZ (nullable)

**siwe_nonces** tablosu:
- id: UUID (PK, default: gen_random_uuid())
- nonce: TEXT (UNIQUE, NOT NULL)
- expires_at: TIMESTAMPTZ (NOT NULL)
- consumed_at: TIMESTAMPTZ (nullable)
- created_at: TIMESTAMPTZ (default: now())

**game_scores** tablosu:
- id: UUID (PK, default: gen_random_uuid())
- user_id: UUID (FK -> users.id, ON DELETE CASCADE)
- game_type: VARCHAR(50) (NOT NULL)
- score: INTEGER (NOT NULL)
- monthly_profit: BIGINT (default: 0)
- session_id: UUID (nullable)
- time_taken: INTEGER (nullable)
- game_started_at: TIMESTAMPTZ (nullable)
- validation_data: TEXT (nullable)
- is_validated: BOOLEAN (default: false)
- leaderboard_period: VARCHAR(7) (NOT NULL, format: YYYY-MM)
- created_at: TIMESTAMPTZ (default: now())

**barn_game_attempts** tablosu:
- id: UUID (PK, default: gen_random_uuid())
- user_id: UUID (FK -> users.id, UNIQUE, ON DELETE CASCADE)
- free_game_used: BOOLEAN (default: false)
- play_pass_expires_at: TIMESTAMPTZ (nullable)
- play_pass_purchased_at: TIMESTAMPTZ (nullable)
- cooldown_ends_at: TIMESTAMPTZ (nullable)
- last_played_date: VARCHAR(10) (nullable)
- total_coins_won_today: INTEGER (default: 0)
- matches_found_today: INTEGER (default: 0)
- has_active_game: BOOLEAN (default: false)
- created_at: TIMESTAMPTZ (default: now())
- updated_at: TIMESTAMPTZ (default: now())

**barn_game_purchases** tablosu:
- id: UUID (PK, default: gen_random_uuid())
- user_id: UUID (FK -> users.id, ON DELETE CASCADE)
- payment_reference: VARCHAR(100) (NOT NULL)
- transaction_id: VARCHAR(100) (nullable)
- amount: TEXT (NOT NULL)
- token_symbol: VARCHAR(10) (NOT NULL)
- status: VARCHAR(20) (default: 'pending')
- play_pass_duration_ms: BIGINT (default: 3600000)
- created_at: TIMESTAMPTZ (default: now())
- confirmed_at: TIMESTAMPTZ (nullable)

**payment_references** tablosu:
- id: UUID (PK, default: gen_random_uuid())
- reference_id: VARCHAR(64) (UNIQUE, NOT NULL)
- user_id: UUID (FK -> users.id, ON DELETE CASCADE)
- amount: TEXT (NOT NULL)
- token_symbol: VARCHAR(10) (NOT NULL)
- item_type: VARCHAR(50) (NOT NULL)
- status: VARCHAR(20) (default: 'pending')
- expires_at: TIMESTAMPTZ (NOT NULL)
- created_at: TIMESTAMPTZ (default: now())

**claim_transactions** tablosu:
- id: UUID (PK, default: gen_random_uuid())
- user_id: UUID (FK -> users.id, ON DELETE CASCADE)
- claim_type: VARCHAR(50) (NOT NULL)
- amount: TEXT (NOT NULL)
- token_address: VARCHAR(42) (NOT NULL)
- tx_hash: VARCHAR(66) (nullable)
- status: VARCHAR(20) (default: 'pending')
- error_message: TEXT (nullable)
- block_number: BIGINT (nullable)
- created_at: TIMESTAMPTZ (default: now())
- confirmed_at: TIMESTAMPTZ (nullable)

**daily_bonus_claims** tablosu:
- id: UUID (PK, default: gen_random_uuid())
- user_id: UUID (FK -> users.id, ON DELETE CASCADE)
- claim_date: VARCHAR(10) (NOT NULL)
- amount: TEXT (NOT NULL)
- transaction_id: UUID (FK -> claim_transactions.id, nullable)
- claimed_at: TIMESTAMPTZ (default: now())
- UNIQUE(user_id, claim_date)

**sessions** tablosu:
- id: UUID (PK, default: gen_random_uuid())
- user_id: UUID (FK -> users.id, ON DELETE CASCADE)
- token_hash: TEXT (NOT NULL)
- wallet_address: VARCHAR(42) (NOT NULL)
- expires_at: TIMESTAMPTZ (NOT NULL)
- is_active: BOOLEAN (default: true)
- user_agent: TEXT (nullable)
- ip_address: VARCHAR(45) (nullable)
- created_at: TIMESTAMPTZ (default: now())
- last_used_at: TIMESTAMPTZ (default: now())

### Indexler:
```sql
CREATE INDEX users_wallet_address_idx ON users(wallet_address);
CREATE INDEX game_scores_user_id_idx ON game_scores(user_id);
CREATE INDEX game_scores_leaderboard_period_idx ON game_scores(leaderboard_period);
CREATE INDEX game_scores_monthly_profit_idx ON game_scores(monthly_profit);
CREATE INDEX siwe_nonces_nonce_idx ON siwe_nonces(nonce);
CREATE INDEX siwe_nonces_expires_at_idx ON siwe_nonces(expires_at);
```

### RLS Politikaları:
Tüm tablolarda RLS'i etkinleştir ve service role için full access ver:
```sql
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON [table_name]
FOR ALL USING (true) WITH CHECK (true);
```

## 2. ENVIRONMENT VARIABLES

Lovable'da şu environment variables'ları ayarla:

- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase anon key
- `SUPABASE_URL`: Supabase project URL (backend için)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (backend için)
- `JWT_SECRET`: Minimum 32 karakter uzunluğunda güvenli bir secret (örn: openssl rand -hex 32)
- `WORLD_CHAIN_RPC_URL`: https://worldchain-mainnet.g.alchemy.com/public (opsiyonel)

## 3. SUPABASE EDGE FUNCTIONS

`supabase/functions/` klasöründeki edge function'ları Supabase'e deploy et:
- auth/index.ts - SIWE kimlik doğrulama
- scores/index.ts - Skor gönderimi
- leaderboard/index.ts - Sıralama
- barn/index.ts - Play Pass sistemi
- claim/index.ts - Token claim
- user/index.ts - Kullanıcı profili

## 4. API ROUTING

Bu proje Vite + React kullanıyor. API endpoint'leri `/api/` prefix'i ile çalışıyor.

Lovable'ın backend API'lerini şu şekilde yönlendir:
- GET/POST `/api/auth/siwe/*` -> Supabase Edge Function: auth
- POST `/api/scores/submit` -> Supabase Edge Function: scores
- GET `/api/leaderboard` -> Supabase Edge Function: leaderboard
- GET/POST `/api/barn/*` -> Supabase Edge Function: barn
- POST `/api/claim/*` -> Supabase Edge Function: claim
- GET `/api/user/profile` -> Supabase Edge Function: user

## 5. FRONTEND AYARLARI

Frontend zaten Lovable-ready:
- React 18 + TypeScript + Vite
- shadcn/ui + Tailwind CSS
- Supabase client entegrasyonu mevcut (`src/integrations/supabase/`)

## 6. WORLD APP MİNİKİT

Bu uygulama World App MiniKit kullanıyor. Production'da:
- `@worldcoin/minikit-js` paketi zaten yüklü
- World App içinde çalışacak şekilde yapılandırılmış
- SIWE (Sign In With Ethereum) authentication

## 7. KONTROL LİSTESİ

Deploy sonrası şunları kontrol et:
1. [ ] Supabase bağlantısı çalışıyor mu?
2. [ ] Tablolar oluşturuldu mu?
3. [ ] Edge functions deploy edildi mi?
4. [ ] Environment variables ayarlandı mı?
5. [ ] Frontend build başarılı mı?
6. [ ] API endpoint'leri çalışıyor mu?

## PROJE YAPISI

```
/
├── api/                    # Backend API routes (Node.js)
├── src/                    # Frontend (React)
│   ├── components/         # UI components
│   ├── context/            # React contexts (Auth, Game)
│   ├── lib/                # Utilities
│   └── pages/              # Page components
├── lib/                    # Shared backend utilities
│   ├── db/                 # Supabase client
│   ├── services/           # Business logic
│   └── config/             # Constants
├── supabase/
│   ├── functions/          # Edge Functions (Deno)
│   └── migrations/         # SQL migrations
└── contracts/              # Smart contracts
```

## OYUN AÇIKLAMASI

Bu bir kart eşleştirme oyunu:
- 5x5 grid (25 kart)
- 12 çift futbol emojisi + 1 bonus yıldız
- 90 saniye süre limiti
- Her kazanılan oyun 100 coin
- Aylık leaderboard sistemi
- Play Pass sistemi (1 WLD = 1 saat sınırsız oyun)

Projeyi tam olarak çalışır hale getir ve test et.
```

---

## KULLANIM

1. Lovable Cloud'da yeni proje aç veya mevcut projeyi import et
2. Yukarıdaki prompt'u Lovable'a yapıştır
3. Lovable'ın Supabase entegrasyonunu kullanarak veritabanını bağla
4. Environment variables'ları ayarla
5. Deploy et

## NOTLAR

- Lovable otomatik olarak Supabase Edge Functions deploy edebilir
- Frontend zaten Lovable-compatible
- World App MiniKit entegrasyonu production-ready

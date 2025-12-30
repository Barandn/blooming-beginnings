# 🌱 Blooming Beginnings - World App Mini-App

## Hızlı Başlangıç

### 1. Geliştirme Ortamı

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

### 2. Vercel'e Deploy

```bash
# Deploy script'ini çalıştır
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# Veya manuel
vercel --prod
```

### 3. Veritabanı Kurulumu

1. **Vercel Dashboard** → Projen → **Storage**
2. **Create Database** → **Postgres**
3. **Connect** tıkla
4. Tabloları oluştur:

```bash
npm run db:push
```

### 4. Environment Variables

Vercel Dashboard → **Settings** → **Environment Variables**:

| Variable | Açıklama | Örnek |
|----------|----------|-------|
| `WORLD_APP_ID` | Developer Portal'dan | `app_abc123...` |
| `WORLD_VERIFY_ACTION` | Doğrulama action | `verify-human` |
| `JWT_SECRET` | Session şifreleme | `min-32-karakter-secret` |
| `NEXT_PUBLIC_APP_URL` | Deploy URL | `https://xxx.vercel.app` |

### 5. World Developer Portal

1. [developer.worldcoin.org](https://developer.worldcoin.org) → **Create App**
2. App URL: `https://your-app.vercel.app`
3. Actions oluştur: `verify-human`, `claim-daily-bonus`
4. App ID'yi kopyala

### 6. Test Et

Mini app linkin:
```
https://worldcoin.org/mini-app?app_id=YOUR_APP_ID
```

Bu linki World App içinde aç!

---

## Proje Yapısı

```
blooming-beginnings/
├── api/                    # Vercel Serverless API
│   ├── auth/              # Kimlik doğrulama
│   ├── verify/            # World ID doğrulama
│   ├── claim/             # Token talep
│   ├── scores/            # Skor gönderimi
│   └── leaderboard/       # Liderlik tablosu
│
├── lib/                    # Backend servisleri
│   ├── db/                # Veritabanı şeması
│   ├── services/          # İş mantığı
│   └── config/            # Yapılandırma
│
├── src/                    # Frontend (React)
│   ├── components/        # UI bileşenleri
│   ├── context/           # State yönetimi
│   └── lib/minikit/       # MiniKit entegrasyonu
│
└── scripts/               # Yardımcı scriptler
```

## API Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/verify/world-id` | POST | World ID doğrulama |
| `/api/auth/login` | POST | Cüzdan ile giriş |
| `/api/claim/daily-bonus` | POST | Günlük bonus al |
| `/api/scores/submit` | POST | Oyun skoru gönder |
| `/api/leaderboard` | GET | Liderlik tablosu |
| `/api/user/profile` | GET | Kullanıcı profili |

## Veritabanı Şeması

- **users** - Kullanıcı kimlik eşlemesi (nullifier → wallet)
- **claim_transactions** - Token dağıtım geçmişi
- **game_scores** - Doğrulanmış oyun skorları
- **daily_bonus_claims** - Günlük bonus takibi
- **sessions** - Oturum yönetimi

## Güvenlik

- ✅ Orb-only World ID doğrulama
- ✅ Nullifier hash ile çoklu hesap engelleme
- ✅ 24 saat bonus cooldown
- ✅ Anti-cheat skor doğrulama
- ✅ Rate limiting
- ✅ JWT session yönetimi

## Komutlar

```bash
npm run dev          # Geliştirme sunucusu
npm run build        # Production build
npm run db:push      # Veritabanı şemasını uygula
npm run db:studio    # Drizzle Studio (DB yönetimi)
```

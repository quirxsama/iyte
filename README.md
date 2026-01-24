# İYTE Discord Bot - YKS Çalışma Asistanı

YKS hazırlık sürecinde motivasyon ve takip için tasarlanmış kapsamlı bir Discord botu.

## 🚀 Özellikler

### 📅 YKS Geri Sayım

- Her gün saat 08:00'da otomatik geri sayım mesajı
- YKS ve İYTE temalı motive edici sözler
- `/yks` komutu ile anında geri sayım

### 🎤 Ses Kanalı Takibi

- Kullanıcıların ses kanalında geçirdiği süreyi otomatik kayıt
- Kanal değiştirme ve ayrılma logları
- Detaylı süre raporları

### ✅ To-Do Listesi

- Belirlenen kanala yazılan mesajlar otomatik to-do olur
- Her satır ayrı bir görev
- Etkileşimli butonlarla tamamlanan/başarısız işaretleme

### 🔗 Chain (Zincir) Sistemi

- Günlük çalışma zinciri takibi
- En iyi zincir kaydı
- Motivasyon için streak sistemi

### 📚 Ders Çalışma Takibi

- Günlük çalışma süresi girişi
- Haftalık istatistikler
- Görsel grafikler

### 📊 İstatistikler

- Tüm verilerin tek komutla özeti
- Ses süresi, chain, ders süresi, to-do oranları

## 📦 Kurulum

### 1. Gereksinimleri Yükle

```bash
npm install
```

### 2. Ortam Değişkenlerini Ayarla

`.env.example` dosyasını `.env` olarak kopyala ve değerleri doldur:

```bash
cp .env.example .env
```

```env
DISCORD_TOKEN=bot_tokeniniz
CLIENT_ID=uygulama_id
GUILD_ID=sunucu_id  # Opsiyonel - geliştirme için
```

### 3. Discord Developer Portal Ayarları

1. [Discord Developer Portal](https://discord.com/developers/applications)'a git
2. Yeni uygulama oluştur
3. Bot sekmesinden token al
4. **Privileged Gateway Intents** altında şunları aç:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT (opsiyonel)

### 4. Komutları Kaydet

```bash
npm run register
```

### 5. Botu Başlat

```bash
npm start
# veya geliştirme için:
npm run dev
```

## 🛠️ Komutlar

| Komut                      | Açıklama                 |
| -------------------------- | ------------------------ |
| `/yks`                     | YKS geri sayımını göster |
| `/chain ekle`              | Zinciri 1 gün ilerlet    |
| `/chain kır`               | Zinciri sıfırla          |
| `/chain durum`             | Zincir durumunu göster   |
| `/ders ekle <dakika>`      | Ders süresi ekle         |
| `/ders bugün`              | Bugünkü toplam süre      |
| `/ders hafta`              | Son 7 günlük özet        |
| `/istatistik [kullanıcı]`  | İstatistikleri göster    |
| `/ayarla yks <#kanal>`     | YKS geri sayım kanalı    |
| `/ayarla ses-log <#kanal>` | Ses log kanalı           |
| `/ayarla todo <#kanal>`    | To-do kanalı             |
| `/ayarla chain <#kanal>`   | Chain kanalı             |
| `/ayarla göster`           | Mevcut ayarlar           |

## 📁 Proje Yapısı

```
├── src/
│   ├── index.js              # Ana giriş
│   ├── deploy-commands.js    # Komut kaydı
│   ├── database/
│   │   └── db.js             # SQLite veritabanı
│   ├── commands/
│   │   ├── ayarla.js         # Kanal ayarları
│   │   ├── chain.js          # Zincir sistemi
│   │   ├── ders.js           # Ders süresi
│   │   ├── istatistik.js     # İstatistikler
│   │   └── yks.js            # YKS geri sayım
│   ├── events/
│   │   ├── ready.js          # Bot hazır
│   │   ├── voiceStateUpdate.js
│   │   ├── messageCreate.js
│   │   └── interactionCreate.js
│   ├── modules/
│   │   ├── countdown.js      # Geri sayım
│   │   └── motivationalQuotes.js
│   └── utils/
│       └── embed.js          # Embed yardımcıları
└── data/
    └── bot.db                # SQLite veritabanı
```

## 🎓 İYTE'ye Başarılar!

Bu bot, YKS hazırlık sürecinde motivasyonunuzu yüksek tutmak ve çalışmalarınızı takip etmek için tasarlanmıştır. Düzenli kullanım, hedefinize ulaşmanızda size yardımcı olacaktır!

🏛️ **Hedef: İYTE!**

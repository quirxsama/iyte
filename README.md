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
GEMINI_API_KEY=google_ai_studio_api_keyiniz
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
| `/tekrar ekle`             | Konu tekrarı ekle        |
| `/tekrar liste`            | Tekrar listesini göster  |
| `/tekrar bugün`            | Bugünkü tekrarları gör   |
| `/tekrar ara`              | Tekrar konularında ara   |
| `/tekrar not`              | Tekrar konusuna not ekle |
| `/coz`                     | Fotoğraflı veya metinli soru çözümlet |

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
│   │   ├── coz.js            # Gemini AI soru çözümü
│   │   ├── ders.js           # Ders süresi
│   │   ├── istatistik.js     # İstatistikler
│   │   ├── tekrar.js         # Spaced Repetition (Tekrar) sistemi
│   │   └── yks.js            # YKS geri sayım
│   ├── events/
│   │   ├── ready.js          # Bot hazır ve Cron İşleri (08:00, 23:30, 05:00, Pazar 20:00)
│   │   ├── voiceStateUpdate.js
│   │   ├── messageCreate.js
│   │   └── interactionCreate.js
│   ├── modules/
│   │   ├── countdown.js      # Geri sayım
│   │   ├── dailyStats.js     # Günlük istatistik
│   │   ├── morningMessage.js # AI Sabah mesajı
│   │   ├── nightlyReminder.js# AI Gece hatırlatması
│   │   ├── reviewReminder.js # Günlük tekrar mesajı
│   │   └── weeklyReport.js   # AI Haftalık Karne
│   └── utils/
│       ├── ai.js             # Gemini AI entegrasyonu
│       └── embed.js          # Embed yardımcıları
└── data/
    └── bot.db                # SQLite veritabanı
```

## 🤖 Yapay Zeka Özellikleri (Gemini AI)
- **/coz Komutu**: Atılan fotoğrafları veya metinleri asabi, sert ama sevecen bir "Hoca" edasıyla çözer. Doğru/yanlış yaklaşımlarını değerlendirir.
- **Sabah Günaydın Mesajı (05:00)**: Her kullanıcıya istatistiklerine göre motive edici özel günaydın mesajı.
- **Geri Sayım Alıntıları**: YKS geri sayımları yapay zeka destekli dinamik motivasyon mesajları ile gelir.
- **Gece Kontrolü (23:30)**: Çalışmayan veya hedefini erteleyenlere özel sert AI motivasyon mesajı.
- **Haftalık Karne (Pazar 20:00)**: O haftanın analizini yapıp Hoca ağzından "karne" verilir.

## 🎓 İYTE'ye Başarılar!

Bu bot, YKS hazırlık sürecinde motivasyonunuzu yüksek tutmak ve çalışmalarınızı takip etmek için tasarlanmıştır. Düzenli kullanım, hedefinize ulaşmanızda size yardımcı olacaktır!

🏛️ **Hedef: İYTE!**

// YKS ve İYTE temalı motive edici sözler

export const motivationalQuotes = [
    // YKS Temalı
    "🎯 Her soru çözdüğünde hedefe bir adım daha yaklaşıyorsun!",
    "📚 Bugün ektiklerin, yarın hasatın olacak.",
    "💪 Binlerce soru çöz, bir soru fark eder!",
    "🌟 YKS bir maraton, her gün bir adım at!",
    "🔥 Disiplin, başarının anahtarıdır!",
    "⏰ Vakit nakittir, her dakikayı değerlendir!",
    "📖 Bir sayfa daha, bir soru daha!",
    "🎓 Hayallerin için çalış, yorgunluk geçici başarı kalıcı!",
    "💡 Anlamadığın konu, çalışmadığın konudur!",
    "🚀 Rakiplerin çalışırken sen de çalış, onlar dinlenirken sen de çalış!",
    "✨ Her yanlış, doğruya giden yolda bir basamak!",
    "🏆 Şampiyon olmak için şampiyon gibi çalış!",
    "📝 Tekrar tekrar çöz, mükemmellik tekrarda gizli!",
    "🌅 Bugün zor olabilir, ama yarın daha güçlü olacaksın!",
    "💎 Elmas baskı altında oluşur, sen de bu süreçte parlayacaksın!",
    
    // İYTE Temalı
    "🏛️ İYTE kapıları seni bekliyor!",
    "🌊 O sahilde el sallamak için...",
    "🎓 İYTE'de mühendis olmak hayal değil, hedef!",
    "🏆 Her çözülen soru İYTE'ye bir tuğla!",
    "✨ Hayalindeki kampüste yürüdüğünü hayal et!",
    "🌿 Urla'nın yeşilliklerinde, deniz kokusunda ders çalışacaksın!",
    "🔬 Türkiye'nin en iyi araştırma üniversitelerinden birinde okuyacaksın!",
    "🌍 İYTE'de dünya standartlarında eğitim seni bekliyor!",
    "🎯 İYTE hedefine kilitlen, gerisi gelir!",
    "🌟 İYTE'li olmak bir ayrıcalık, bu ayrıcalığı hak et!",
    "🏗️ İYTE mühendisleri geleceği inşa eder, sen de onlardan biri ol!",
    
    // Genel Motivasyon
    "🚀 Başarı, küçük çabaların toplamıdır.",
    "💡 Bugün zorlanıyorsan, yarın güçleniyorsun!",
    "🌈 Yağmurdan sonra gökkuşağı gelir.",
    "⭐ Sen yapabilirsin, inan ve çalış!",
    "🎯 Hedefe odaklan, geri kalan önemsiz!",
    "🦋 Kelebek olmak için kozadan çıkmak gerek!",
    "🌱 Her gün biraz daha iyi ol, küçük adımlar büyük mesafeler kat eder!",
    "💪 Yorgunluk geçici, pişmanlık kalıcı!",
    "🏃 Yavaş da olsa ilerlemeye devam et, durmak yok!",
    "🎭 Bugün fedakarlık yap, yarın özgürce seç!",
    "🌠 Yıldızlara ulaşmak için yerden kalkmak lazım!",
    "🔑 Başarının sırrı: Başla, devam et, asla vazgeçme!",
    "🎪 Hayat bir sirk, sen de cambaz ol - denge kur ve devam et!",
    "🌻 Güneşe dön, gölgeler arkanda kalır!",
    "⚡ Enerji nereye odaklanırsan oraya akar, hedefe odaklan!",
    
    // Espirili/Eğlenceli
    "☕ Kahveni al, koltuğuna otur, soru çözmeye başla!",
    "🎮 Oyun sonra, önce soru!",
    "📱 Telefonu bırak, kitabı aç!",
    "🍕 Pizza sınavdan sonra daha lezzetli olacak!",
    "😴 Uyku sınavdan sonra, şimdi çalışma zamanı!",
    "🎬 Leyla ile Mecnun bekleyebilir, İYTE beklemez!",
    "🏋️ Beyin de kas gibidir, çalıştıkça güçlenir!"
];

export function getRandomQuote() {
    return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
}

export function getDailyQuote(dayOfYear) {
    // Günün sırasına göre söz seç (her gün farklı ama tutarlı)
    return motivationalQuotes[dayOfYear % motivationalQuotes.length];
}

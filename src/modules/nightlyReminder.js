import { EmbedBuilder } from 'discord.js';
import { 
    getAllUsersStats, 
    getChain, 
    getTodayStudyTime,
    getUserTodoStats
} from '../database/db.js';

// Sert motivasyon mesajları - Chain eklenmemiş
const chainMessages = [
    'Bugün chain eklemedin. YKS\'yi mi saldın? 🤡',
    'Chain 0. Timur çalışırken sen ne yapıyorsun?',
    'Bugün zincirini kırdın. Yarın da kıracak mısın yoksa adam mı olacaksın?',
    'Chain yok. Hedef İYTE diyordun, yoksa şaka mıydı? 😏',
    'Bugün chain eklememişsin. Disiplin sıfır. Böyle YKS kazanılmaz.',
    'Zincirin koptu. Herkes çalışırken sen tatildesin galiba. 🏖️',
    'Chain eklemeyi unuttun mu? Yoksa tembellik mi bu?',
    'Bugün chain yok. Bu gidişle seneye tekrar hazırlık var.',
    'Zincir? Hangi zincir? Bugün hiçbir şey yapmamışsın.',
    'Chain eklemeden yatağa mı giriyorsun? Timur şu an test çözüyor.'
];

// Sert motivasyon mesajları - Ders çalışılmamış
const studyMessages = [
    'Bugün 0 dakika ders çalışmışsın. SIFIR. YKS\'yi saldın mı? 📉',
    'Ders çalışma: 0 dk. Sence bu yeterli mi İYTE için?',
    'Bugün hiç çalışmadın. Sıralaman düşerken rahat mısın?',
    'Ders süresi: Yok. Motivasyon: Yok. Hedef: Yok mu acaba?',
    'Sıfır dakika çalışma. Böyle giderse İYTE değil, pişmanlık seni bekliyor.',
    'Bugün tek bir dakika bile çalışmamışsın. Bu tembellik değilse ne?',
    'Ders çalışmadan yatıyorsun. Yarın "keşke çalışsaydım" diyeceksin.',
    'Çalışma süresi: 0. Timur bugün saatlerce çalıştı. Sen?',
    'Hiç çalışmamışsın. Bu gidişle YKS\'de sürpriz olmaz, hayal kırıklığı olur.',
    'Bugün 0 dk ders. Hedef İYTE ama çaba nerede? 🎯'
];

// Sert motivasyon mesajları - Tamamlanmamış görevler
const todoMessages = [
    'Tamamlanmamış görevlerin var. Plan yapıp uygulamıyorsan neden plan yapıyorsun?',
    'To-do listende bekleyen görevler var. Erteleme alışkanlığın mı bu?',
    'Görevlerini tamamlamamışsın. Kendine verdiğin sözleri tutamıyorsan kime tutacaksın?',
    'Bekleyen görevler var. Disiplin = yapacağını söylediğini yapmak. Basit.',
    'To-do\'larını bitirmeden yatma. Yarına bırakma, yarın yeni görevler gelecek.',
    'Tamamlanmamış görevlerin birikmiş. Bu kadar erteleme ile İYTE hayal.',
    'Görevler bekliyor ama sen yatıyorsun. Önceliklerin nerede?',
    'To-do listesi: hâlâ bekleyen var. "Yarın yaparım" deme, bugün yap!'
];

function getRandomMessage(messages) {
    return messages[Math.floor(Math.random() * messages.length)];
}

export async function sendNightlyReminders(client) {
    const today = new Date().toISOString().split('T')[0];
    
    // YKS Days left (for Gemini context)
    let yksDaysLeft = 0;
    try {
        const { getDaysUntilYKS } = await import('./countdown.js');
        yksDaysLeft = getDaysUntilYKS();
    } catch(e) {}

    // Tüm sunucuları kontrol et
    for (const guild of client.guilds.cache.values()) {
        const userIds = getAllUsersStats(guild.id);
        
        for (const userId of userIds) {
            try {
                const issues = [];
                
                // Chain kontrolü
                const chain = getChain(guild.id, userId);
                const chainUpdatedToday = chain?.last_update === today;
                if (!chainUpdatedToday) {
                    issues.push({
                        type: 'chain',
                        message: getRandomMessage(chainMessages)
                    });
                }
                
                // Ders çalışma kontrolü
                const todayStudy = getTodayStudyTime(guild.id, userId);
                if (todayStudy === 0) {
                    issues.push({
                        type: 'study',
                        message: getRandomMessage(studyMessages)
                    });
                }
                
                // To-do kontrolü
                const todoStats = getUserTodoStats(guild.id, userId);
                if (todoStats && todoStats.pending > 0) {
                    issues.push({
                        type: 'todo',
                        message: getRandomMessage(todoMessages)
                    });
                }
                
                // Eğer sorun yoksa (adam çalışmış), skip
                if (issues.length === 0) continue;
                
                // DM gönder
                const user = await client.users.fetch(userId);
                if (!user) continue;

                let description = '';
                
                try {
                    const { askGemini, generatePersonaPrompt } = await import('../utils/ai.js');
                    const missingItemsStr = issues.map(i => i.type).join(', ');
                    const prompt = generatePersonaPrompt({
                        chain: chain?.chain_count,
                        yksDaysLeft: yksDaysLeft,
                        totalStudyTime: todayStudy,
                        pendingTodos: todoStats?.pending,
                        completedTodos: todoStats?.completed
                    }, `Şu an saat 23:30. Bu öğrenci bugün şu konularda eksik kaldı: ${missingItemsStr}. Ona gece uyumadan önce neden ders çalışması gerektiğini, bu eksikliklerle hedefine (İYTE) ulaşamayacağını sert bir dille ama içten içe sevdiğini belli ederek kısa (maksimum 4-5 cümle) bir mesaj yaz.`);

                    const aiQuote = await askGemini(prompt);
                    if (aiQuote && !aiQuote.includes("Sistemde Gemini API Key tanımlı değil")) {
                        description = aiQuote;
                    } else {
                        throw new Error("Fallback to static messages");
                    }
                } catch(e) {
                    for (const issue of issues) {
                        const emoji = issue.type === 'chain' ? '🔗' : issue.type === 'study' ? '📚' : '✅';
                        description += `${emoji} ${issue.message}\n\n`;
                    }
                    description += '---\n💪 *Yarın daha iyi ol. Kendini kandırma.*';
                }
                
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ Gece Kontrolü — Hoca Konuşuyor')
                    .setDescription(description)
                    .setColor(0xe74c3c)
                    .setFooter({ text: '🎓 İYTE seni bekliyor. Ama beklemekten yorulabilir. | Yapay Zeka Destekli' })
                    .setTimestamp();
                
                // Bugünkü durumu özet olarak ekle
                const fields = [];
                if (!chainUpdatedToday) {
                    fields.push({ name: '🔗 Chain', value: '❌ Bugün eklenmedi', inline: true });
                }
                if (todayStudy === 0) {
                    fields.push({ name: '📚 Ders', value: '❌ 0 dakika', inline: true });
                }
                if (todoStats?.pending > 0) {
                    fields.push({ name: '✅ To-Do', value: `⏳ ${todoStats.pending} bekleyen`, inline: true });
                }
                
                if (fields.length > 0) {
                    embed.addFields(fields);
                }
                
                await user.send({ embeds: [embed] });
                console.log(`🌙 Gece hatırlatması gönderildi: ${user.username} (${issues.length} eksik)`);
                
            } catch (error) {
                // DM kapalıysa veya başka hata
                console.error(`Gece hatırlatması gönderilemedi (User: ${userId}):`, error.message);
            }
        }
    }
}

import cron from 'node-cron';
import { sendDailyCountdown } from '../modules/countdown.js';
import { sendDailyStats } from '../modules/dailyStats.js';

export const name = 'ready';
export const once = true;

export async function execute(client) {
    console.log(`✅ ${client.user.tag} olarak giriş yapıldı!`);
    console.log(`📊 ${client.guilds.cache.size} sunucuda aktif`);
    
    // Bot durumunu ayarla
    client.user.setPresence({
        activities: [{ name: 'YKS Geri Sayım 📚', type: 3 }], // Watching
        status: 'online'
    });
    
    // Her gün saat 08:00'da YKS geri sayımı ve günlük istatistikler gönder
    cron.schedule('0 8 * * *', async () => {
        console.log('📅 Günlük YKS geri sayımı gönderiliyor...');
        await sendDailyCountdown(client);
        
        console.log('📊 Günlük istatistikler gönderiliyor...');
        await sendDailyStats(client);
    }, {
        timezone: 'Europe/Istanbul'
    });
    
    console.log('⏰ Günlük geri sayım ve istatistikler zamanlandı (08:00)');
}

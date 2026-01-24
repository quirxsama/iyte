import cron from 'node-cron';
import { sendDailyCountdown } from '../modules/countdown.js';

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
    
    // Her gün saat 08:00'da YKS geri sayımı gönder
    cron.schedule('0 8 * * *', () => {
        console.log('📅 Günlük YKS geri sayımı gönderiliyor...');
        sendDailyCountdown(client);
    }, {
        timezone: 'Europe/Istanbul'
    });
    
    console.log('⏰ Günlük geri sayım zamanlandı (08:00)');
}

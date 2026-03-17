import cron from 'node-cron';
import { sendDailyCountdown } from '../modules/countdown.js';
import { sendDailyStats } from '../modules/dailyStats.js';
import { sendDailyReviewReminders } from '../modules/reviewReminder.js';
import { sendNightlyReminders } from '../modules/nightlyReminder.js';
import { sendMorningMessages } from '../modules/morningMessage.js';
import { sendWeeklyReports } from '../modules/weeklyReport.js';

export const name = 'ready';
export const once = true;

export async function execute(client) {
    console.log(`✅ ${client.user.tag} olarak giriş yapıldı!`);
    console.log(`📊 ${client.guilds.cache.size} sunucuda aktif`);
    
    // Bot durumunu ayarla
    client.user.setPresence({
        activities: [{ name: 'YKS & MSÜ Geri Sayım 📚', type: 3 }], // Watching
        status: 'online'
    });
    
    // Her gün saat 08:00'da YKS/MSÜ geri sayımı, günlük istatistikler ve tekrar hatırlatmaları gönder
    cron.schedule('0 8 * * *', async () => {
        console.log('📅 Günlük YKS/MSÜ geri sayımı gönderiliyor...');
        await sendDailyCountdown(client);
        
        console.log('📊 Günlük istatistikler gönderiliyor...');
        await sendDailyStats(client);
        
        console.log('📚 Tekrar hatırlatmaları gönderiliyor...');
        await sendDailyReviewReminders(client);
    }, {
        timezone: 'Europe/Istanbul'
    });
    
    // Her gece 23:30'da eksik kontrolleri ve sert hatırlatmalar
    cron.schedule('30 23 * * *', async () => {
        console.log('🌙 Gece hatırlatmaları gönderiliyor...');
        await sendNightlyReminders(client);
    }, {
        timezone: 'Europe/Istanbul'
    });

    // Sabah mesajı 05:00'da atılır
    cron.schedule('0 5 * * *', async () => {
        console.log('🌅 Sabah günaydın mesajları gönderiliyor...');
        await sendMorningMessages(client);
    }, {
        timezone: 'Europe/Istanbul'
    });

    // Haftalık pazar karnesi saat 20:00'da atılır
    cron.schedule('0 20 * * 0', async () => {
        console.log('📊 Haftalık karneler gönderiliyor...');
        await sendWeeklyReports(client);
    }, {
        timezone: 'Europe/Istanbul'
    });
    
    console.log('⏰ Günlük geri sayım, istatistikler ve tekrar hatırlatmaları zamanlandı (08:00)');
    console.log('🌙 Gece hatırlatmaları zamanlandı (23:30)');
    console.log('🌅 Sabah mesajları zamanlandı (05:00)');
    console.log('📊 Haftalık karne zamanlandı (Pazar 20:00)');
}

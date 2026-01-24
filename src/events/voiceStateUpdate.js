import { 
    startVoiceSession, 
    endVoiceSession, 
    getGuildSettings 
} from '../database/db.js';
import { createVoiceLogEmbed } from '../utils/embed.js';

export const name = 'voiceStateUpdate';

export async function execute(oldState, newState) {
    const user = newState.member?.user || oldState.member?.user;
    if (!user || user.bot) return;
    
    const guildId = newState.guild?.id || oldState.guild?.id;
    const userId = user.id;
    
    // Kullanıcı ses kanalına katıldı
    if (!oldState.channelId && newState.channelId) {
        const channel = newState.channel;
        startVoiceSession(guildId, userId, channel.id, channel.name);
        console.log(`🎤 ${user.tag} ${channel.name} kanalına katıldı`);
    }
    
    // Kullanıcı ses kanalından ayrıldı
    else if (oldState.channelId && !newState.channelId) {
        const session = endVoiceSession(guildId, userId, Date.now());
        
        if (session && session.duration_seconds > 0) {
            console.log(`🎤 ${user.tag} ${session.channel_name} kanalından ayrıldı (${session.duration_seconds} saniye)`);
            
            // Log kanalına gönder
            const settings = getGuildSettings(guildId);
            if (settings?.voice_log_channel_id) {
                try {
                    const logChannel = await oldState.guild.channels.fetch(settings.voice_log_channel_id);
                    if (logChannel) {
                        const embed = createVoiceLogEmbed(user, session.channel_name, session.duration_seconds);
                        await logChannel.send({ embeds: [embed] });
                    }
                } catch (error) {
                    console.error('Ses log gönderilemedi:', error.message);
                }
            }
        }
    }
    
    // Kullanıcı kanal değiştirdi
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        // Eski oturumu bitir
        const session = endVoiceSession(guildId, userId, Date.now());
        
        if (session && session.duration_seconds > 0) {
            // Log kanalına gönder
            const settings = getGuildSettings(guildId);
            if (settings?.voice_log_channel_id) {
                try {
                    const logChannel = await oldState.guild.channels.fetch(settings.voice_log_channel_id);
                    if (logChannel) {
                        const embed = createVoiceLogEmbed(user, session.channel_name, session.duration_seconds);
                        await logChannel.send({ embeds: [embed] });
                    }
                } catch (error) {
                    console.error('Ses log gönderilemedi:', error.message);
                }
            }
        }
        
        // Yeni oturumu başlat
        const newChannel = newState.channel;
        startVoiceSession(guildId, userId, newChannel.id, newChannel.name);
        console.log(`🎤 ${user.tag} ${newChannel.name} kanalına geçti`);
    }
}

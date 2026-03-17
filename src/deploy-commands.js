import pkg from 'discord.js';
const { REST, Routes } = pkg;
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];

// Komutları yükle
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`📝 ${command.data.name} komutu yüklendi`);
    } else {
        console.warn(`⚠️ ${filePath} dosyasında 'data' veya 'execute' eksik.`);
    }
}

// REST client oluştur
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Komutları kaydet
(async () => {
    try {
        console.log(`🔄 ${commands.length} komut kaydediliyor...`);
        
        let data;
        
        if (process.env.GUILD_ID) {
            // Geliştirme: Sadece belirli sunucuya kaydet (anında aktif)
            data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            console.log(`✅ ${data.length} komut sunucuya kaydedildi (Guild: ${process.env.GUILD_ID})`);
        } else {
            // Prodüksiyon: Global olarak kaydet (1 saat sonra aktif)
            data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log(`✅ ${data.length} komut global olarak kaydedildi`);
        }
        
    } catch (error) {
        console.error('❌ Komut kaydı hatası:', error);
    }
})();

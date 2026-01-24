import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// .env dosyasını yükle
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Veritabanını başlat (tabloları oluşturur)
import './database/db.js';

// Client oluştur
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Message,
        Partials.Channel
    ]
});

// Koleksiyonlar
client.commands = new Collection();
client.cooldowns = new Collection();

// Komutları yükle
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`📝 ${command.data.name} komutu yüklendi`);
    } else {
        console.warn(`⚠️ ${filePath} dosyasında 'data' veya 'execute' eksik.`);
    }
}

// Event'leri yükle
const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    const event = await import(`file://${filePath}`);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`📌 ${event.name} eventi yüklendi`);
}

// Hata yakalama
process.on('unhandledRejection', error => {
    console.error('Yakalanmamış Promise hatası:', error);
});

process.on('uncaughtException', error => {
    console.error('Yakalanmamış hata:', error);
});

// Bot'u başlat
client.login(process.env.DISCORD_TOKEN);

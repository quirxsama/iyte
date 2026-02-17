import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Data klasörünü oluştur
const dataDir = join(__dirname, '../../data');
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
}

const db = new Database(join(dataDir, 'bot.db'));

// WAL modu - daha iyi performans
db.pragma('journal_mode = WAL');

// Tabloları oluştur
db.exec(`
    -- Sunucu ayarları
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        countdown_channel_id TEXT,
        voice_log_channel_id TEXT,
        todo_channel_id TEXT,
        chain_channel_id TEXT
    );

    -- Aktif ses oturumları (geçici)
    CREATE TABLE IF NOT EXISTS active_voice_sessions (
        guild_id TEXT,
        user_id TEXT,
        channel_id TEXT,
        channel_name TEXT,
        start_time INTEGER,
        PRIMARY KEY (guild_id, user_id)
    );

    -- Ses oturumu geçmişi
    CREATE TABLE IF NOT EXISTS voice_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        channel_id TEXT,
        channel_name TEXT,
        start_time INTEGER,
        end_time INTEGER,
        duration_seconds INTEGER
    );

    -- To-do listesi
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        message_id TEXT UNIQUE,
        content TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER
    );

    -- Chain sistemi
    CREATE TABLE IF NOT EXISTS chains (
        guild_id TEXT,
        user_id TEXT,
        chain_count INTEGER DEFAULT 0,
        last_update TEXT,
        best_chain INTEGER DEFAULT 0,
        PRIMARY KEY (guild_id, user_id)
    );

    -- Ders çalışma süreleri
    CREATE TABLE IF NOT EXISTS study_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        duration_minutes INTEGER,
        date TEXT,
        created_at INTEGER
    );

    -- Birden fazla to-do kanalı
    CREATE TABLE IF NOT EXISTS todo_channels (
        guild_id TEXT,
        channel_id TEXT,
        PRIMARY KEY (guild_id, channel_id)
    );

    -- Ders ses kanalları (istatistiklerde ayrı sayılacak)
    CREATE TABLE IF NOT EXISTS study_voice_channels (
        guild_id TEXT,
        channel_id TEXT,
        PRIMARY KEY (guild_id, channel_id)
    );

    -- Tekrar sistemi (spaced repetition)
    CREATE TABLE IF NOT EXISTS review_topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        topic TEXT,
        created_at TEXT,
        d1_date TEXT,
        d7_date TEXT,
        d14_date TEXT,
        d30_date TEXT,
        d1_done INTEGER DEFAULT 0,
        d7_done INTEGER DEFAULT 0,
        d14_done INTEGER DEFAULT 0,
        d30_done INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active'
    );
`);

// Prepared statements
const statements = {
    // Guild Settings
    getGuildSettings: db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?'),
    upsertGuildSettings: db.prepare(`
        INSERT INTO guild_settings (guild_id, countdown_channel_id, voice_log_channel_id, todo_channel_id, chain_channel_id)
        VALUES (@guild_id, @countdown_channel_id, @voice_log_channel_id, @todo_channel_id, @chain_channel_id)
        ON CONFLICT(guild_id) DO UPDATE SET
            countdown_channel_id = COALESCE(@countdown_channel_id, countdown_channel_id),
            voice_log_channel_id = COALESCE(@voice_log_channel_id, voice_log_channel_id),
            todo_channel_id = COALESCE(@todo_channel_id, todo_channel_id),
            chain_channel_id = COALESCE(@chain_channel_id, chain_channel_id)
    `),
    updateChannelSetting: db.prepare(`
        INSERT INTO guild_settings (guild_id) VALUES (?)
        ON CONFLICT(guild_id) DO NOTHING
    `),
    
    // Voice Sessions
    startVoiceSession: db.prepare(`
        INSERT OR REPLACE INTO active_voice_sessions (guild_id, user_id, channel_id, channel_name, start_time)
        VALUES (?, ?, ?, ?, ?)
    `),
    getActiveVoiceSession: db.prepare('SELECT * FROM active_voice_sessions WHERE guild_id = ? AND user_id = ?'),
    endVoiceSession: db.prepare('DELETE FROM active_voice_sessions WHERE guild_id = ? AND user_id = ?'),
    saveVoiceSession: db.prepare(`
        INSERT INTO voice_sessions (guild_id, user_id, channel_id, channel_name, start_time, end_time, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    getUserTotalVoiceTime: db.prepare(`
        SELECT COALESCE(SUM(duration_seconds), 0) as total
        FROM voice_sessions WHERE guild_id = ? AND user_id = ?
    `),
    getGuildTotalVoiceTime: db.prepare(`
        SELECT user_id, COALESCE(SUM(duration_seconds), 0) as total
        FROM voice_sessions WHERE guild_id = ?
        GROUP BY user_id ORDER BY total DESC
    `),

    // Todos
    createTodo: db.prepare(`
        INSERT INTO todos (guild_id, user_id, message_id, content, status, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?)
    `),
    getTodoByMessageId: db.prepare('SELECT * FROM todos WHERE message_id = ?'),
    updateTodoStatus: db.prepare('UPDATE todos SET status = ? WHERE message_id = ?'),
    getUserTodos: db.prepare('SELECT * FROM todos WHERE guild_id = ? AND user_id = ?'),
    getUserTodoStats: db.prepare(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM todos WHERE guild_id = ? AND user_id = ?
    `),

    // Chains
    getChain: db.prepare('SELECT * FROM chains WHERE guild_id = ? AND user_id = ?'),
    upsertChain: db.prepare(`
        INSERT INTO chains (guild_id, user_id, chain_count, last_update, best_chain)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET
            chain_count = excluded.chain_count,
            last_update = excluded.last_update,
            best_chain = MAX(best_chain, excluded.best_chain)
    `),
    resetChain: db.prepare(`
        UPDATE chains SET chain_count = 0, last_update = ? WHERE guild_id = ? AND user_id = ?
    `),

    // Study Sessions
    addStudySession: db.prepare(`
        INSERT INTO study_sessions (guild_id, user_id, duration_minutes, date, created_at)
        VALUES (?, ?, ?, ?, ?)
    `),
    getTodayStudyTime: db.prepare(`
        SELECT COALESCE(SUM(duration_minutes), 0) as total
        FROM study_sessions WHERE guild_id = ? AND user_id = ? AND date = ?
    `),
    getUserTotalStudyTime: db.prepare(`
        SELECT COALESCE(SUM(duration_minutes), 0) as total
        FROM study_sessions WHERE guild_id = ? AND user_id = ?
    `),
    getLast7DaysStudy: db.prepare(`
        SELECT date, SUM(duration_minutes) as total
        FROM study_sessions WHERE guild_id = ? AND user_id = ?
        GROUP BY date ORDER BY date DESC LIMIT 7
    `)
};

// Helper functions
export function getGuildSettings(guildId) {
    return statements.getGuildSettings.get(guildId);
}

export function updateGuildChannel(guildId, channelType, channelId) {
    statements.updateChannelSetting.run(guildId);
    const updateStmt = db.prepare(`UPDATE guild_settings SET ${channelType} = ? WHERE guild_id = ?`);
    return updateStmt.run(channelId, guildId);
}

export function getAllGuildsWithCountdown() {
    return db.prepare('SELECT * FROM guild_settings WHERE countdown_channel_id IS NOT NULL').all();
}

// Voice session functions
export function startVoiceSession(guildId, userId, channelId, channelName) {
    return statements.startVoiceSession.run(guildId, userId, channelId, channelName, Date.now());
}

export function getActiveVoiceSession(guildId, userId) {
    return statements.getActiveVoiceSession.get(guildId, userId);
}

export function endVoiceSession(guildId, userId, endTime) {
    const session = statements.getActiveVoiceSession.get(guildId, userId);
    if (!session) return null;
    
    const durationSeconds = Math.floor((endTime - session.start_time) / 1000);
    statements.saveVoiceSession.run(
        guildId, userId, session.channel_id, session.channel_name,
        session.start_time, endTime, durationSeconds
    );
    statements.endVoiceSession.run(guildId, userId);
    
    return { ...session, end_time: endTime, duration_seconds: durationSeconds };
}

export function getUserTotalVoiceTime(guildId, userId) {
    return statements.getUserTotalVoiceTime.get(guildId, userId).total;
}

export function getGuildVoiceLeaderboard(guildId) {
    return statements.getGuildTotalVoiceTime.all(guildId);
}

// Todo functions
export function createTodo(guildId, userId, messageId, content) {
    return statements.createTodo.run(guildId, userId, messageId, content, Date.now());
}

export function getTodoByMessageId(messageId) {
    return statements.getTodoByMessageId.get(messageId);
}

export function updateTodoStatus(messageId, status) {
    return statements.updateTodoStatus.run(status, messageId);
}

export function updateTodoContent(messageId, content) {
    const stmt = db.prepare('UPDATE todos SET content = ? WHERE message_id = ?');
    return stmt.run(content, messageId);
}

export function deleteTodo(messageId) {
    const stmt = db.prepare('DELETE FROM todos WHERE message_id = ?');
    return stmt.run(messageId);
}

export function getUserTodoStats(guildId, userId) {
    return statements.getUserTodoStats.get(guildId, userId);
}

// To-do kanal fonksiyonları (çoklu kanal desteği)
export function addTodoChannel(guildId, channelId) {
    const stmt = db.prepare('INSERT OR IGNORE INTO todo_channels (guild_id, channel_id) VALUES (?, ?)');
    return stmt.run(guildId, channelId);
}

export function removeTodoChannel(guildId, channelId) {
    const stmt = db.prepare('DELETE FROM todo_channels WHERE guild_id = ? AND channel_id = ?');
    return stmt.run(guildId, channelId);
}

export function getTodoChannels(guildId) {
    const stmt = db.prepare('SELECT channel_id FROM todo_channels WHERE guild_id = ?');
    return stmt.all(guildId).map(row => row.channel_id);
}

export function isTodoChannel(guildId, channelId) {
    const stmt = db.prepare('SELECT 1 FROM todo_channels WHERE guild_id = ? AND channel_id = ?');
    return stmt.get(guildId, channelId) !== undefined;
}

// Ders ses kanalları fonksiyonları
export function addStudyVoiceChannel(guildId, channelId) {
    const stmt = db.prepare('INSERT OR IGNORE INTO study_voice_channels (guild_id, channel_id) VALUES (?, ?)');
    return stmt.run(guildId, channelId);
}

export function removeStudyVoiceChannel(guildId, channelId) {
    const stmt = db.prepare('DELETE FROM study_voice_channels WHERE guild_id = ? AND channel_id = ?');
    return stmt.run(guildId, channelId);
}

export function getStudyVoiceChannels(guildId) {
    const stmt = db.prepare('SELECT channel_id FROM study_voice_channels WHERE guild_id = ?');
    return stmt.all(guildId).map(row => row.channel_id);
}

export function isStudyVoiceChannel(guildId, channelId) {
    const stmt = db.prepare('SELECT 1 FROM study_voice_channels WHERE guild_id = ? AND channel_id = ?');
    return stmt.get(guildId, channelId) !== undefined;
}

// Chain functions
export function getChain(guildId, userId) {
    return statements.getChain.get(guildId, userId);
}

export function incrementChain(guildId, userId) {
    const today = new Date().toISOString().split('T')[0];
    const existing = statements.getChain.get(guildId, userId);
    
    if (existing) {
        const newCount = existing.chain_count + 1;
        const newBest = Math.max(existing.best_chain, newCount);
        statements.upsertChain.run(guildId, userId, newCount, today, newBest);
        return { chain_count: newCount, best_chain: newBest, last_update: today };
    } else {
        statements.upsertChain.run(guildId, userId, 1, today, 1);
        return { chain_count: 1, best_chain: 1, last_update: today };
    }
}

export function breakChain(guildId, userId) {
    const today = new Date().toISOString().split('T')[0];
    const existing = statements.getChain.get(guildId, userId);
    if (existing) {
        statements.resetChain.run(today, guildId, userId);
    }
    return { chain_count: 0, best_chain: existing?.best_chain || 0 };
}

// Study session functions
export function addStudySession(guildId, userId, durationMinutes, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return statements.addStudySession.run(guildId, userId, durationMinutes, targetDate, Date.now());
}

export function getTodayStudyTime(guildId, userId) {
    const today = new Date().toISOString().split('T')[0];
    return statements.getTodayStudyTime.get(guildId, userId, today).total;
}

export function getYesterdayStudyTime(guildId, userId) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    return statements.getTodayStudyTime.get(guildId, userId, yesterdayStr)?.total || 0;
}

export function getUserTotalStudyTime(guildId, userId) {
    return statements.getUserTotalStudyTime.get(guildId, userId).total;
}

export function getLast7DaysStudy(guildId, userId) {
    return statements.getLast7DaysStudy.all(guildId, userId);
}

// Tüm kullanıcıların istatistiklerini al (günlük özet için)
export function getAllUsersStats(guildId) {
    const users = new Set();
    
    // Ses oturumlarından kullanıcıları al
    const voiceUsers = db.prepare('SELECT DISTINCT user_id FROM voice_sessions WHERE guild_id = ?').all(guildId);
    voiceUsers.forEach(u => users.add(u.user_id));
    
    // Ders çalışma kayıtlarından kullanıcıları al
    const studyUsers = db.prepare('SELECT DISTINCT user_id FROM study_sessions WHERE guild_id = ?').all(guildId);
    studyUsers.forEach(u => users.add(u.user_id));
    
    // Chain kayıtlarından kullanıcıları al
    const chainUsers = db.prepare('SELECT DISTINCT user_id FROM chains WHERE guild_id = ?').all(guildId);
    chainUsers.forEach(u => users.add(u.user_id));
    
    // To-do kayıtlarından kullanıcıları al
    const todoUsers = db.prepare('SELECT DISTINCT user_id FROM todos WHERE guild_id = ?').all(guildId);
    todoUsers.forEach(u => users.add(u.user_id));
    
    return Array.from(users);
}

// Belirli kullanıcının detaylı istatistiklerini al
export function getUserDetailedStats(guildId, userId) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Ders ses kanallarını al
    const studyChannels = getStudyVoiceChannels(guildId);
    
    // Ses istatistikleri - Ders kanalları
    let studyVoiceTotal = 0;
    let studyVoiceToday = 0;
    
    // Ses istatistikleri - Diğer kanallar
    let otherVoiceTotal = 0;
    let otherVoiceToday = 0;
    
    // Toplam ses süreleri
    const allVoiceSessions = db.prepare(`
        SELECT channel_id, COALESCE(SUM(duration_seconds), 0) as total
        FROM voice_sessions 
        WHERE guild_id = ? AND user_id = ?
        GROUP BY channel_id
    `).all(guildId, userId);
    
    for (const session of allVoiceSessions) {
        if (studyChannels.includes(session.channel_id)) {
            studyVoiceTotal += session.total;
        } else {
            otherVoiceTotal += session.total;
        }
    }
    
    // Bugünkü ses süreleri
    const todayVoiceSessions = db.prepare(`
        SELECT channel_id, COALESCE(SUM(duration_seconds), 0) as total
        FROM voice_sessions 
        WHERE guild_id = ? AND user_id = ? AND date(start_time/1000, 'unixepoch', 'localtime') = ?
        GROUP BY channel_id
    `).all(guildId, userId, today);
    
    for (const session of todayVoiceSessions) {
        if (studyChannels.includes(session.channel_id)) {
            studyVoiceToday += session.total;
        } else {
            otherVoiceToday += session.total;
        }
    }
    
    // Ders çalışma istatistikleri
    const totalStudy = statements.getUserTotalStudyTime.get(guildId, userId)?.total || 0;
    const todayStudy = statements.getTodayStudyTime.get(guildId, userId, today)?.total || 0;
    const yesterdayStudy = statements.getTodayStudyTime.get(guildId, userId, yesterdayStr)?.total || 0;
    
    // Chain
    const chain = statements.getChain.get(guildId, userId);
    
    // To-do istatistikleri
    const todoStats = statements.getUserTodoStats.get(guildId, userId);
    
    // Son 7 gün ortalaması
    const last7Days = statements.getLast7DaysStudy.all(guildId, userId);
    const weeklyTotal = last7Days.reduce((sum, d) => sum + d.total, 0);
    const weeklyAvg = last7Days.length > 0 ? Math.round(weeklyTotal / last7Days.length) : 0;
    
    return {
        voice: {
            studyTotal: studyVoiceTotal,
            studyToday: studyVoiceToday,
            otherTotal: otherVoiceTotal,
            otherToday: otherVoiceToday,
            total: studyVoiceTotal + otherVoiceTotal,
            today: studyVoiceToday + otherVoiceToday
        },
        study: {
            total: totalStudy,
            today: todayStudy,
            yesterday: yesterdayStudy,
            weeklyAvg: weeklyAvg
        },
        chain: {
            current: chain?.chain_count || 0,
            best: chain?.best_chain || 0,
            lastUpdate: chain?.last_update || null
        },
        todos: {
            total: todoStats?.total || 0,
            completed: todoStats?.completed || 0,
            failed: todoStats?.failed || 0,
            pending: todoStats?.pending || 0,
            completionRate: todoStats?.total > 0 
                ? Math.round((todoStats.completed / todoStats.total) * 100) 
                : 0
        }
    };
}

// === Tekrar Sistemi (Spaced Repetition) ===
export function addReviewTopic(guildId, userId, topic) {
    const now = new Date();
    const createdAt = now.toISOString().split('T')[0];
    
    const addDays = (date, days) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };
    
    const d1 = addDays(now, 1);
    const d7 = addDays(now, 7);
    const d14 = addDays(now, 14);
    const d30 = addDays(now, 30);
    
    const stmt = db.prepare(`
        INSERT INTO review_topics (guild_id, user_id, topic, created_at, d1_date, d7_date, d14_date, d30_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(guildId, userId, topic, createdAt, d1, d7, d14, d30);
}

export function getReviewTopicsByUser(guildId, userId) {
    const stmt = db.prepare(`
        SELECT * FROM review_topics 
        WHERE guild_id = ? AND user_id = ? AND status = 'active'
        ORDER BY created_at DESC
    `);
    return stmt.all(guildId, userId);
}

export function getDueReviews(guildId, userId, date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
        SELECT * FROM review_topics 
        WHERE guild_id = ? AND user_id = ? AND status = 'active'
        AND (
            (d1_date = ? AND d1_done = 0) OR
            (d7_date = ? AND d7_done = 0) OR
            (d14_date = ? AND d14_done = 0) OR
            (d30_date = ? AND d30_done = 0)
        )
        ORDER BY created_at ASC
    `);
    return stmt.all(guildId, userId, today, today, today, today);
}

export function getAllDueReviewsToday(date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
        SELECT * FROM review_topics 
        WHERE status = 'active'
        AND (
            (d1_date = ? AND d1_done = 0) OR
            (d7_date = ? AND d7_done = 0) OR
            (d14_date = ? AND d14_done = 0) OR
            (d30_date = ? AND d30_done = 0)
        )
        ORDER BY user_id, created_at ASC
    `);
    return stmt.all(today, today, today, today);
}

export function markReviewDone(topicId, interval) {
    const column = `d${interval}_done`;
    const validColumns = ['d1_done', 'd7_done', 'd14_done', 'd30_done'];
    if (!validColumns.includes(column)) return null;
    
    const stmt = db.prepare(`UPDATE review_topics SET ${column} = 1 WHERE id = ?`);
    return stmt.run(topicId);
}

export function deleteReviewTopic(topicId, userId) {
    const stmt = db.prepare('DELETE FROM review_topics WHERE id = ? AND user_id = ?');
    return stmt.run(topicId, userId);
}

export function getReviewTopicById(topicId) {
    const stmt = db.prepare('SELECT * FROM review_topics WHERE id = ?');
    return stmt.get(topicId);
}

export default db;

const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const DATA_FILE = './playerData.json';
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Veri yükleme fonksiyonları
function loadData() {
    if (!fs.existsSync(DATA_FILE)) return {};
    try { return JSON.parse(fs.readFileSync(DATA_FILE)); } 
    catch(e) { return {}; }
}

function saveData(data) { 
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); 
}

// API Routes
app.get('/api/players', (req, res) => {
    const data = loadData();
    const players = Object.values(data).map(p => ({
        userId: p.userId,
        username: p.username,
        level: p.level,
        kills: p.kills,
        deaths: p.deaths,
        scraps: p.scraps,
        health: p.health,
        maxHealth: p.maxHealth,
        activeZone: p.activeZone,
        isNight: p.isNight
    }));
    res.json(players);
});

app.get('/api/player/:userId', (req, res) => {
    const data = loadData();
    const player = data[req.params.userId];
    if (!player) return res.status(404).json({ error: 'Oyuncu bulunamadı' });
    res.json(player);
});

app.post('/api/admin/give-scraps', (req, res) => {
    const { userId, amount, adminId } = req.body;
    const data = loadData();
    
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu bulunamadı' });
    if (!data[adminId] || adminId !== 'YOUR_DISCORD_USER_ID_HERE') {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    data[userId].scraps += amount;
    saveData(data);
    
    io.emit('player-updated', { userId, scraps: data[userId].scraps });
    res.json({ success: true, newScraps: data[userId].scraps });
});

app.post('/api/admin/reset-player', (req, res) => {
    const { userId, adminId } = req.body;
    const data = loadData();
    
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu bulunamadı' });
    if (!data[adminId] || adminId !== 'YOUR_DISCORD_USER_ID_HERE') {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    // Sıfırlama işlemi
    const defaultData = {
        userId: data[userId].userId,
        username: data[userId].username,
        bio: 'Harran\'da hayatta kalmaya çalışan bir cesur.',
        health: 100, maxHealth: 100,
        stamina: 100, infection: 0,
        level: 1, exp: 0,
        power: 1, agility: 1,
        scraps: 150,
        inventory: [],
        ammo: { pistol: 0, shotgun: 0, rifle: 0, sniper: 0 },
        inventorySlots: 30,
        weapons: [{ 
            name: 'Tahta Parçası', emoji: '🪵', damage: 15, durability: 20, maxDurability: 20, type: 'melee',
            effect: 'ezme', effectDesc: 'Sersemletme'
        }],
        activeWeaponIndex: 0,
        blueprints: [],
        activeZone: '🏚️ Gecekondu', isNight: false,
        ownedSafeZones: ['🏚️ İlkel Sığınak'],
        activeSafeZone: '🏚️ İlkel Sığınak',
        lastActivity: Date.now(),
        kills: 0, deaths: 0, totalScraps: 0,
        achievements: [], completedQuests: [],
        dailyKills: 0, dailyExplore: 0,
        currentEnemy: null
    };
    
    data[userId] = defaultData;
    saveData(data);
    
    io.emit('player-reset', { userId });
    res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
    const data = loadData();
    const players = Object.values(data);
    const totalPlayers = players.length;
    const totalKills = players.reduce((sum, p) => sum + p.kills, 0);
    const totalDeaths = players.reduce((sum, p) => sum + p.deaths, 0);
    const avgLevel = totalPlayers ? (players.reduce((sum, p) => sum + p.level, 0) / totalPlayers).toFixed(1) : 0;
    const topPlayer = players.sort((a, b) => b.level - a.level)[0];
    
    res.json({
        totalPlayers,
        totalKills,
        totalDeaths,
        avgLevel,
        topPlayer: topPlayer ? { name: topPlayer.username, level: topPlayer.level } : null
    });
});

// WebSocket bağlantıları
io.on('connection', (socket) => {
    console.log('Yeni web bağlantısı');
    
    socket.on('request-update', () => {
        const data = loadData();
        socket.emit('full-update', Object.values(data));
    });
    
    socket.on('disconnect', () => {
        console.log('Web bağlantısı koptu');
    });
});

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Bot durumu kontrolü
app.get('/api/bot-status', (req, res) => {
    res.json({ 
        status: 'online',
        timestamp: Date.now()
    });
});

server.listen(PORT, () => {
    console.log(`✅ Web Dashboard çalışıyor: http://localhost:${PORT}`);
    console.log(`📊 Admin paneli için giriş yapabilirsiniz`);
});
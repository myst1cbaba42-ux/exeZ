const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

const PREFIX = '!';
const DATA_FILE = './playerData.json';
const TOKEN = '';              // 🔴 Kendi token'ını yaz
const CLIENT_ID = '1490637565911367740';          // 🔴 Bot Client ID
const OWNER_ID = '476475823914745856';     // 🔴 Kendi Discord ID'n (wh01.exe)

// ======================= COOLDOWN =======================
const cooldowns = new Map();
function setCooldown(userId, command) { cooldowns.set(`${userId}-${command}`, Date.now() + 5000); }
function isOnCooldown(userId, command) {
    const key = `${userId}-${command}`;
    const cd = cooldowns.get(key);
    if (!cd) return false;
    if (Date.now() < cd) return true;
    cooldowns.delete(key);
    return false;
}
function getCooldownTime(userId, command) {
    const key = `${userId}-${command}`;
    const cd = cooldowns.get(key);
    if (!cd) return 0;
    return Math.ceil((cd - Date.now()) / 1000);
}
function isOwner(userId) { return userId === OWNER_ID; }

// ======================= GÖRSELLER (LİNK) =======================
const IMAGES = {
    profile: 'https://i.imgur.com/zY8u8vv.jpeg',
    help: 'https://i.imgur.com/biXJ4ek.gif',
    loot: 'https://i.imgur.com/zY8u8vv.jpeg',
    trader: 'https://i.imgur.com/3a75eT1.gif',
    blueprint: 'https://i.imgur.com/zY8u8vv.jpeg',
    levelup: 'https://i.imgur.com/3a75eT1.gif',
    parkour: 'https://i.imgur.com/mzYCKRI.gif',
    death: 'https://i.imgur.com/rNMQehX.gif',
    safezone: 'https://i.imgur.com/zY8u8vv.jpeg',
    day: 'https://i.imgur.com/zY8u8vv.jpeg',
    night: 'https://i.imgur.com/3a75eT1.gif',
    biter: 'https://i.imgur.com/biXJ4ek.gif',
    viral: 'https://i.imgur.com/biXJ4ek.gif',
    goon: 'https://i.imgur.com/gMYpf1q.gif',
    screamer: 'https://i.imgur.com/biXJ4ek.gif',
    volatile: 'https://i.imgur.com/3a75eT1.gif',
    nightHunter: 'https://i.imgur.com/mzYCKRI.gif',
    demolisher: 'https://i.imgur.com/gMYpf1q.gif',
    alphaVolatile: 'https://i.imgur.com/rNMQehX.gif'
};

// ======================= DÜŞMANLAR (HASAR ARTIRILDI) =======================
const ENEMIES = {
    day: [
        { name: '🧟 Biters', health: 40, damage: 22, xp: 20, scrap: 6, level: 1, image: IMAGES.biter, desc: 'Yavaş ama sürü halinde tehlikeli' },
        { name: '🏃 Virals', health: 60, damage: 28, xp: 35, scrap: 10, level: 2, image: IMAGES.viral, desc: 'Hızlı ve agresif' },
        { name: '🔨 Goon', health: 120, damage: 38, xp: 60, scrap: 20, level: 3, image: IMAGES.goon, desc: 'Ağır darbe vurur' },
        { name: '📢 Screamers', health: 35, damage: 18, xp: 40, scrap: 12, level: 2, image: IMAGES.screamer, desc: 'Çığlığı diğerlerini çağırır' }
    ],
    night: [
        { name: '🌙 Volatile', health: 180, damage: 55, xp: 150, scrap: 40, level: 5, image: IMAGES.volatile, desc: 'Gecenin korkulu rüyası' },
        { name: '🌙 Night Hunter', health: 250, damage: 75, xp: 220, scrap: 60, level: 7, image: IMAGES.nightHunter, desc: 'Ultimate avcı' },
        { name: '💪 Demolisher', health: 350, damage: 90, xp: 300, scrap: 80, level: 8, image: IMAGES.demolisher, desc: 'Zırh yırtıcı' },
        { name: '👑 Alpha Volatile', health: 300, damage: 85, xp: 400, scrap: 100, level: 10, image: IMAGES.alphaVolatile, desc: 'Sürünün lideri' }
    ]
};

// ======================= DROP TABLOSU =======================
const DROP_TABLE = {
    common: [
        { name: '🔧 Hurda', min: 5, max: 12, chance: 20, type: 'scrap', craftMaterial: true, icon: '🔧' },
        { name: '🪵 Tahta', min: 3, max: 8, chance: 18, type: 'wood', craftMaterial: true, icon: '🪵' },
        { name: '📌 Çivi', min: 4, max: 10, chance: 18, type: 'nail', craftMaterial: true, icon: '📌' },
        { name: '🔩 Vida', min: 3, max: 8, chance: 15, type: 'screw', craftMaterial: true, icon: '🔩' },
        { name: '🧵 Kumaş', min: 2, max: 6, chance: 15, type: 'cloth', craftMaterial: true, icon: '🧵' },
        { name: '🍞 Ekmek', min: 1, max: 2, chance: 14, type: 'food', heal: 10, icon: '🍞' }
    ],
    rare: [
        { name: '🔧 Kaliteli Hurda', min: 12, max: 25, chance: 18, type: 'scrap', craftMaterial: true, icon: '🔧' },
        { name: '〰️ Tel', min: 5, max: 12, chance: 16, type: 'wire', craftMaterial: true, icon: '〰️' },
        { name: '🧴 Yapıştırıcı', min: 2, max: 5, chance: 14, type: 'glue', craftMaterial: true, icon: '🧴' },
        { name: '🔋 Pil', min: 1, max: 3, chance: 12, type: 'battery', craftMaterial: true, icon: '🔋' },
        { name: '💊 Medkit', min: 1, max: 1, chance: 20, type: 'heal', heal: 50, icon: '💊' },
        { name: '⚡ Enerji', min: 1, max: 2, chance: 20, type: 'stamina', stamina: 50, icon: '⚡' }
    ],
    epic: [
        { name: '🔧 Mühendislik Hurdası', min: 25, max: 50, chance: 15, type: 'scrap', craftMaterial: true, icon: '🔧' },
        { name: '🧯 Hortum', min: 2, max: 5, chance: 12, type: 'hose', craftMaterial: true, icon: '🧯' },
        { name: '⚡ Kablo', min: 3, max: 8, chance: 12, type: 'cable', craftMaterial: true, icon: '⚡' },
        { name: '🥤 Plastik', min: 4, max: 10, chance: 12, type: 'plastic', craftMaterial: true, icon: '🥤' },
        { name: '💊 Tıbbi Set', min: 1, max: 1, chance: 25, type: 'heal', heal: 100, icon: '💊' },
        { name: '🔥 Molotof', min: 1, max: 1, chance: 24, type: 'throwable', damage: 80, icon: '🔥' }
    ]
};

// ======================= SİLAHLAR (her silahın kendi emojisi) =======================
const MELEE_WEAPONS = [
    { name: 'Tahta Parçası', emoji: '🪵', damage: 15, durability: 20, price: 15, level: 1, effect: 'ezme', effectDesc: 'Sersemletme', type: 'melee' },
    { name: 'Boru', emoji: '🔧', damage: 25, durability: 25, price: 35, level: 2, effect: 'ezme', effectDesc: 'Yüksek sersemletme', type: 'melee' },
    { name: 'Machete', emoji: '🗡️', damage: 45, durability: 35, price: 80, level: 3, effect: 'kesme', effectDesc: 'Kanama', type: 'melee' },
    { name: 'Katana', emoji: '⚔️', damage: 70, durability: 45, price: 150, level: 5, effect: 'kesme', effectDesc: 'Yüksek kanama', type: 'melee' },
    { name: 'Savaş Baltası', emoji: '🪓', damage: 95, durability: 40, price: 250, level: 7, effect: 'ezme', effectDesc: 'Zırh delici', type: 'melee' },
    { name: 'Volatile Bıçağı', emoji: '💀', damage: 130, durability: 50, price: 500, level: 10, effect: 'zehir', effectDesc: 'Zehirli hasar', type: 'melee' },
    { name: 'Yıldırım Kılıcı', emoji: '⚡', damage: 180, durability: 60, price: 1000, level: 12, effect: 'elektrik', effectDesc: 'Şok', type: 'melee' }
];

const RANGED_WEAPONS = [
    { name: 'Tabanca', emoji: '🔫', damage: 35, durability: 40, price: 100, level: 3, ammoType: 'pistol', ammoPerShot: 1, effect: 'kesme', effectDesc: 'Orta menzil', type: 'ranged' },
    { name: 'Pompalı', emoji: '🔫', damage: 80, durability: 35, price: 200, level: 5, ammoType: 'shotgun', ammoPerShot: 1, effect: 'ezme', effectDesc: 'Yakın yüksek hasar', type: 'ranged' },
    { name: 'Tüfek', emoji: '🔫', damage: 55, durability: 45, price: 150, level: 4, ammoType: 'rifle', ammoPerShot: 1, effect: 'kesme', effectDesc: 'Hassas', type: 'ranged' },
    { name: 'Sniper', emoji: '🎯', damage: 120, durability: 30, price: 350, level: 8, ammoType: 'sniper', ammoPerShot: 1, effect: 'delme', effectDesc: 'Çok yüksek hasar', type: 'ranged' },
    { name: 'Kalaşnikof', emoji: '🔫', damage: 45, durability: 50, price: 300, level: 7, ammoType: 'rifle', ammoPerShot: 1, effect: 'kesme', effectDesc: 'Hızlı atış', type: 'ranged' }
];
const ALL_WEAPONS = [...MELEE_WEAPONS, ...RANGED_WEAPONS];

// ======================= MARKET (düzenli, tek emoji) =======================
const MARKET_ITEMS = {
    healing: [
        { name: 'Bandaj', emoji: '🩹', price: 10, item: { name: '🩹 Bandaj', amount: 1, type: 'heal', heal: 20 } },
        { name: 'Medkit', emoji: '💊', price: 25, item: { name: '💊 Medkit', amount: 1, type: 'heal', heal: 60 } },
        { name: 'Tıbbi Set', emoji: '💊', price: 60, item: { name: '💊 Tıbbi Set', amount: 1, type: 'heal', heal: 100 } }
    ],
    weapons: ALL_WEAPONS.map(w => ({ name: w.name, emoji: w.emoji, price: w.price, item: { ...w, type: 'weapon' } })),
    throwables: [
        { name: 'Molotof', emoji: '🔥', price: 30, item: { name: '🔥 Molotof', amount: 1, type: 'throwable', damage: 80 } },
        { name: 'El Bombası', emoji: '💣', price: 60, item: { name: '💣 El Bombası', amount: 1, type: 'throwable', damage: 150 } }
    ],
    tools: [
        { name: 'Kilit Açma Aleti', emoji: '🔓', price: 15, item: { name: '🔓 Kilit Açma Aleti', amount: 1, type: 'tool' } },
        { name: 'Enerji İçeceği', emoji: '⚡', price: 20, item: { name: '⚡ Enerji İçeceği', amount: 1, type: 'stamina', stamina: 60 } }
    ],
    ammo: [
        { name: 'Tabanca Mermisi (10 adet)', emoji: '🔫', price: 5, item: { name: '🔫 Tabanca Mermisi', amount: 10, type: 'ammo', ammoType: 'pistol' } },
        { name: 'Pompalı Mermisi (5 adet)', emoji: '🔫', price: 8, item: { name: '🔫 Pompalı Mermisi', amount: 5, type: 'ammo', ammoType: 'shotgun' } },
        { name: 'Tüfek Mermisi (10 adet)', emoji: '🔫', price: 6, item: { name: '🔫 Tüfek Mermisi', amount: 10, type: 'ammo', ammoType: 'rifle' } },
        { name: 'Sniper Mermisi (5 adet)', emoji: '🎯', price: 10, item: { name: '🎯 Sniper Mermisi', amount: 5, type: 'ammo', ammoType: 'sniper' } }
    ],
    materials: [
        { name: 'Tahta (5 adet)', emoji: '🪵', price: 8, item: { name: '🪵 Tahta', amount: 5, type: 'wood', craftMaterial: true } },
        { name: 'Çivi (10 adet)', emoji: '📌', price: 6, item: { name: '📌 Çivi', amount: 10, type: 'nail', craftMaterial: true } },
        { name: 'Vida (8 adet)', emoji: '🔩', price: 7, item: { name: '🔩 Vida', amount: 8, type: 'screw', craftMaterial: true } },
        { name: 'Kumaş (4 adet)', emoji: '🧵', price: 10, item: { name: '🧵 Kumaş', amount: 4, type: 'cloth', craftMaterial: true } },
        { name: 'Tel (6 adet)', emoji: '〰️', price: 12, item: { name: '〰️ Tel', amount: 6, type: 'wire', craftMaterial: true } },
        { name: 'Pil (2 adet)', emoji: '🔋', price: 15, item: { name: '🔋 Pil', amount: 2, type: 'battery', craftMaterial: true } }
    ]
};

// ======================= CRAFT TARİFLERİ =======================
const CRAFT_RECIPES = {
    'bandaj': { cost: 10, materials: { '🧵 Kumaş': 2 }, result: { name: '🩹 Bandaj', amount: 1, type: 'heal', heal: 20, emoji: '🩹' } },
    'medkit': { cost: 25, materials: { '🧵 Kumaş': 3, '🔧 Hurda': 5, '🧴 Yapıştırıcı': 1 }, result: { name: '💊 Medkit', amount: 1, type: 'heal', heal: 60, emoji: '💊' } },
    'molotof': { cost: 30, materials: { '🧵 Kumaş': 2, '🔧 Hurda': 3, '🔥 Kibrit': 1 }, result: { name: '🔥 Molotof', amount: 1, type: 'throwable', damage: 80, emoji: '🔥' } },
    'enerji': { cost: 20, materials: { '🥤 Plastik': 2, '🔋 Pil': 1, '💧 Su': 1 }, result: { name: '⚡ Enerji İçeceği', amount: 1, type: 'stamina', stamina: 60, emoji: '⚡' } },
    'kilit': { cost: 15, materials: { '🔧 Hurda': 4, '📌 Çivi': 3 }, result: { name: '🔓 Kilit Açma Aleti', amount: 1, type: 'tool', emoji: '🔓' } }
};

// ======================= SAFE ZONELAR =======================
const SAFE_ZONES = [
    { name: '🏚️ İlkel Sığınak', price: 0, healBonus: 20, staminaBonus: 10, infectionReduction: 10 },
    { name: '🏠 Güvenli Ev', price: 500, healBonus: 50, staminaBonus: 25, infectionReduction: 25 },
    { name: '🏰 Korunaklı Karargah', price: 1500, healBonus: 100, staminaBonus: 50, infectionReduction: 50 },
    { name: '⭐ Efsanevi Kale', price: 5000, healBonus: 200, staminaBonus: 80, infectionReduction: 80 }
];

const ZONES = [
    { name: '🏚️ Gecekondu', level: 1, enemyMod: 0.8, lootMod: 0.8 },
    { name: '🏛️ Eski Şehir', level: 3, enemyMod: 1.0, lootMod: 1.0 },
    { name: '📡 Anten Tepesi', level: 5, enemyMod: 1.3, lootMod: 1.3 }
];

// ======================= VERİ YÖNETİMİ =======================
function defaultData(userId, username) {
    return {
        userId, username,
        bio: 'Harran\'da hayatta kalmaya çalışan bir cesur.',
        health: 100, maxHealth: 100,
        stamina: 100, infection: 0,
        level: 1, exp: 0,
        power: 1, agility: 1,
        scraps: 150,
        inventory: [
            { name: '🩹 Bandaj', amount: 2, type: 'heal', heal: 20, emoji: '🩹' },
            { name: '⚡ Enerji İçeceği', amount: 1, type: 'stamina', stamina: 60, emoji: '⚡' },
            { name: '🪵 Tahta', amount: 5, type: 'wood', craftMaterial: true, emoji: '🪵' },
            { name: '📌 Çivi', amount: 10, type: 'nail', craftMaterial: true, emoji: '📌' }
        ],
        ammo: { pistol: 0, shotgun: 0, rifle: 0, sniper: 0 },
        inventorySlots: 30,
        weapons: [{ 
            name: 'Tahta Parçası', emoji: '🪵', damage: 15, durability: 20, maxDurability: 20, type: 'melee',
            effect: 'ezme', effectDesc: 'Sersemletme'
        }],
        activeWeaponIndex: 0,
        blueprints: Object.keys(CRAFT_RECIPES),
        activeZone: '🏚️ Gecekondu', isNight: false,
        ownedSafeZones: ['🏚️ İlkel Sığınak'],
        activeSafeZone: '🏚️ İlkel Sığınak',
        lastActivity: Date.now(),
        kills: 0, deaths: 0, totalScraps: 0,
        achievements: [], completedQuests: [],
        dailyKills: 0, dailyExplore: 0,
        currentEnemy: null
    };
}

function loadData() {
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}));
    try { return JSON.parse(fs.readFileSync(DATA_FILE)); } catch(e) { fs.writeFileSync(DATA_FILE, JSON.stringify({})); return {}; }
}
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function getUserData(userId, username = null) {
    let data = loadData();
    if (!data[userId]) data[userId] = defaultData(userId, username);
    saveData(data);
    return data[userId];
}
function updateUser(userId, updates) {
    let data = loadData();
    if (!data[userId]) data[userId] = defaultData(userId);
    data[userId] = { ...data[userId], ...updates };
    saveData(data);
    return data[userId];
}

function getEnemy(isNight, zoneLevel) {
    const enemies = isNight ? ENEMIES.night : ENEMIES.day;
    const available = enemies.filter(e => e.level <= zoneLevel + 2);
    const enemy = available[Math.floor(Math.random() * available.length)] || enemies[0];
    const mod = 1 + (zoneLevel - 1) * 0.15;
    return {
        name: enemy.name,
        health: Math.floor(enemy.health * mod),
        maxHealth: Math.floor(enemy.health * mod),
        damage: Math.floor(enemy.damage * mod),
        xp: Math.floor(enemy.xp * mod),
        scrap: Math.floor(enemy.scrap * mod),
        image: enemy.image,
        desc: enemy.desc
    };
}

function getZoneLevel(zoneName) { const z = ZONES.find(z => z.name === zoneName); return z ? z.level : 1; }
function getInventoryCount(inv) { return inv.reduce((sum, i) => sum + i.amount, 0); }

function getDropFromEnemy(zoneLevel) {
    let rarity = 'common';
    const r = Math.random() * 100;
    if (zoneLevel >= 5 && r < 10) rarity = 'epic';
    else if (zoneLevel >= 3 && r < 30) rarity = 'rare';
    const table = DROP_TABLE[rarity];
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const item of table) {
        cumulative += item.chance;
        if (roll <= cumulative) {
            const amount = Math.floor(Math.random() * (item.max - item.min + 1)) + item.min;
            return { ...item, amount };
        }
    }
    return { name: '🔧 Hurda', amount: 3, type: 'scrap', icon: '🔧' };
}

async function handleCommand(message, cmd, callback) {
    if (isOnCooldown(message.author.id, cmd)) {
        const remaining = getCooldownTime(message.author.id, cmd);
        return message.reply(`⏳ **Lütfen ${remaining} saniye bekle!**`);
    }
    setCooldown(message.author.id, cmd);
    await callback(message);
}

// ======================= ANA KOMUTLAR =======================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    let player = getUserData(message.author.id, message.author.username);

    // Zaman / gece-gündüz kontrolü
    const now = Date.now();
    const hours = (now - player.lastActivity) / (1000 * 60 * 60);
    if (hours > 4) {
        const cycles = Math.floor(hours / 12);
        if (cycles > 0) {
            updateUser(message.author.id, { isNight: cycles % 2 === 0 ? player.isNight : !player.isNight, lastActivity: now });
            player = getUserData(message.author.id);
        }
    }

    // ---------- YARDIM ----------
    if (cmd === 'help' || cmd === 'yardim') {
        await handleCommand(message, 'help', async (msg) => {
            const embed = new EmbedBuilder()
                .setTitle('🧟 **DYING LIGHT: ULTIMATE v9.0**')
                .setDescription('**Tüm komutlar `/` ile de kullanılabilir!**')
                .setColor(0xff4444)
                .setImage(IMAGES.help)
                .addFields(
                    { name: '⚔️ SAVAŞ', value: '`!kesfet` `!saldir` `!blok` `!kac`', inline: true },
                    { name: '🔫 SİLAHLAR', value: '`!silahlar` `!silah [no]`', inline: true },
                    { name: '👤 KARAKTER', value: '`!profil` `!envanter` `!yükselt`', inline: true },
                    { name: '🏪 MARKET & CRAFT', value: '`!market` `!al` `!sat` `!craft`', inline: true },
                    { name: '🏠 SIĞINAK', value: '`!sığınak` `!safezone`', inline: true },
                    { name: '🌍 DÜNYA', value: '`!harita` `!git` `!gece` `!gündüz`', inline: true },
                    { name: '📚 ÖĞRETİCİ', value: '`!ogretici` veya `!tutorial`', inline: true },
                    { name: '📊 DİĞER', value: '`!başarılar` `!görevler` `!rank` `!bilgi`', inline: true }
                )
                .setFooter({ text: '💡 Her komut 5 saniye bekleme | Yapımcı: @wh01.exe' });
            await msg.reply({ embeds: [embed] });
        });
    }

    // ---------- ÖĞRETİCİ ----------
    else if (cmd === 'ogretici' || cmd === 'tutorial') {
        await handleCommand(message, 'ogretici', async (msg) => {
            const embed = new EmbedBuilder()
                .setTitle('📚 **DYING LIGHT OYNAMA REHBERİ**')
                .setDescription('Harran\'da hayatta kalmak için bilmen gereken her şey!')
                .setColor(0x44aaff)
                .setImage(IMAGES.help)
                .addFields(
                    { name: '🎯 **BAŞLANGIÇ**', value: '`!profil` ile karakterini gör. `!kesfet` ile keşfe çık, düşman bul. `!saldir` ile savaş.', inline: false },
                    { name: '⚔️ **SİLAHLAR**', value: '`!silahlar` listeler, `!silah [no]` ile aktif silah değiştir. Menzilli silahlar için mermi gerekir (`!market`).', inline: false },
                    { name: '💰 **KAYNAK ve MARKET**', value: 'Düşmanlardan hurda ve malzeme düşer. `!market`ten eşya al/sat, `!craft` ile üret.', inline: false },
                    { name: '🏠 **SIĞINAK**', value: '`!sığınak` ile can/dayanıklılık yenile. `!safezone` ile yeni sığınaklar satın al.', inline: false },
                    { name: '🌙 **GECE/GÜNDÜZ**', value: 'Gece düşmanlar daha güçlü ama XP 1.5x. `!gece` / `!gündüz` ile değiştir.', inline: false },
                    { name: '📈 **GELİŞME**', value: 'Seviye atlayınca can ve envanter kapasiten artar. `!yükselt` ile yeteneklerini güçlendir.', inline: false },
                    { name: '🎁 **GÖREVLER ve BAŞARILAR**', value: '`!görevler` günlük görevleri, `!başarılar` başarımları gösterir. Ödüller kazan!', inline: false },
                    { name: '👑 **ADMIN**', value: 'Bot sahibi `!admin` ile oyunculara hurda verebilir, verileri sıfırlayabilir.', inline: false }
                )
                .setFooter({ text: 'İyi oyunlar, hayatta kal! 🧟‍♂️' });
            await msg.reply({ embeds: [embed] });
        });
    }

    // ---------- PROFİL ----------
    else if (cmd === 'profil') {
        await handleCommand(message, 'profil', async (msg) => {
            const hpBar = '🟥'.repeat(Math.floor((player.health/player.maxHealth)*10)) + '⬛'.repeat(10-Math.floor((player.health/player.maxHealth)*10));
            const activeWeapon = player.weapons[player.activeWeaponIndex] || player.weapons[0];
            const embed = new EmbedBuilder()
                .setTitle(`🧟 **${msg.author.username}** - Hayatta Kalan`)
                .setDescription(`*${player.bio}*`)
                .setColor(0xff8844)
                .setThumbnail(msg.author.displayAvatarURL())
                .setImage(player.isNight ? IMAGES.night : IMAGES.day)
                .addFields(
                    { name: '❤️ SAĞLIK', value: `${hpBar} ${player.health}/${player.maxHealth}`, inline: false },
                    { name: '🏃 DAYANIKLILIK', value: `${player.stamina}/100`, inline: true },
                    { name: '🧟 ENFEKSİYON', value: `%${player.infection}`, inline: true },
                    { name: '⭐ SEVİYE', value: `${player.level}`, inline: true },
                    { name: '🔫 SİLAH', value: `${activeWeapon.emoji || '⚔️'} ${activeWeapon.name} (${activeWeapon.effectDesc})`, inline: true },
                    { name: '💰 HURDA', value: `${player.scraps}💰`, inline: true },
                    { name: '🎒 ENVANTER', value: `${getInventoryCount(player.inventory)}/${player.inventorySlots}`, inline: true },
                    { name: '🗺️ BÖLGE', value: player.activeZone, inline: true },
                    { name: '⚔️ ÖLDÜRME', value: `${player.kills}`, inline: true }
                )
                .setFooter({ text: '!profilbio [yazı] | !ogretici' });
            await msg.reply({ embeds: [embed] });
        });
    }

    // ---------- PROFİL BİO ----------
    else if (cmd === 'profilbio') {
        await handleCommand(message, 'profilbio', async (msg) => {
            const bio = args.join(' ');
            if (!bio) return msg.reply('❌ Bir bio yaz! Örnek: `!profilbio Harran\'ın korkusuz savaşçısı`');
            if (bio.length > 200) return msg.reply('❌ Bio max 200 karakter.');
            updateUser(msg.author.id, { bio });
            await msg.reply(`✅ Bio güncellendi: *${bio}*`);
        });
    }

    // ---------- ENVANTER ----------
    else if (cmd === 'envanter') {
        await handleCommand(message, 'envanter', async (msg) => {
            const invList = player.inventory.map(i => `• ${i.emoji || '📦'} ${i.name} x${i.amount}`).join('\n') || '*Boş*';
            const embed = new EmbedBuilder()
                .setTitle(`📦 **${msg.author.username}** - Envanter`)
                .setColor(0x44aaff)
                .setThumbnail(IMAGES.loot)
                .addFields(
                    { name: '🎒 EŞYALAR', value: invList, inline: false },
                    { name: '🔫 MERMİLER', value: `🔫 ${player.ammo.pistol} | 🔫 ${player.ammo.shotgun} | 🔫 ${player.ammo.rifle} | 🎯 ${player.ammo.sniper}`, inline: true },
                    { name: '💰 HURDA', value: `${player.scraps}💰`, inline: true },
                    { name: '📦 KAPASİTE', value: `${getInventoryCount(player.inventory)}/${player.inventorySlots}`, inline: true }
                );
            await msg.reply({ embeds: [embed] });
        });
    }

    // ---------- SİLAHLARI LİSTELE ----------
    else if (cmd === 'silahlar') {
        await handleCommand(message, 'silahlar', async (msg) => {
            let list = '';
            player.weapons.forEach((w, i) => {
                list += `${i+1}. ${w.emoji || '⚔️'} **${w.name}** (⚔️${w.damage} 🔧${w.durability}) - ${w.effectDesc}\n`;
            });
            const embed = new EmbedBuilder()
                .setTitle(`🔫 ${msg.author.username} - Silahlar`)
                .setDescription(list || 'Hiç silahın yok! Marketten satın alabilirsin.')
                .setColor(0xffaa44);
            await msg.reply({ embeds: [embed] });
        });
    }

    // ---------- SİLAH DEĞİŞTİR ----------
    else if (cmd === 'silah') {
        await handleCommand(message, 'silah', async (msg) => {
            const index = parseInt(args[0]) - 1;
            if (isNaN(index)) return msg.reply('❌ Geçersiz numara! Örnek: `!silah 2`');
            if (index < 0 || index >= player.weapons.length) return msg.reply(`❌ Geçersiz silah numarası! Silahların: ${player.weapons.map((_, i) => i+1).join(', ')}`);
            updateUser(msg.author.id, { activeWeaponIndex: index });
            const newWeapon = player.weapons[index];
            await msg.reply(`🔫 **${newWeapon.emoji || '⚔️'} ${newWeapon.name}** aktif silah olarak seçildi!\n⚔️ Hasar: ${newWeapon.damage}\n🎯 Efekt: ${newWeapon.effectDesc}`);
        });
    }

    // ---------- KEŞFET ----------
    else if (cmd === 'kesfet') {
        await handleCommand(message, 'kesfet', async (msg) => {
            if (player.stamina < 15) return msg.reply('💨 Çok yorgunsun! Dinlen.');
            const zoneLevel = getZoneLevel(player.activeZone);
            const enemy = getEnemy(player.isNight, zoneLevel);
            updateUser(msg.author.id, { currentEnemy: enemy, stamina: Math.max(0, player.stamina - 10) });
            const embed = new EmbedBuilder()
                .setTitle('👀 DÜŞMAN BULDUN!')
                .setDescription(`**${enemy.name}** - ${enemy.desc}`)
                .setImage(enemy.image)
                .addFields(
                    { name: '❤️ CAN', value: `${enemy.health}/${enemy.maxHealth}`, inline: true },
                    { name: '⚔️ HASAR', value: `${enemy.damage}`, inline: true },
                    { name: '🎁 ÖDÜL', value: `+${enemy.xp} XP, +${enemy.scrap}💰`, inline: true }
                );
            await msg.reply({ embeds: [embed] });
        });
    }

    // ---------- SALDIR (düzenlendi: can her zaman gösteriliyor) ----------
    else if (cmd === 'saldir') {
        await handleCommand(message, 'saldir', async (msg) => {
            if (!player.currentEnemy || player.currentEnemy.health <= 0) return msg.reply('❌ Önce `!kesfet` ile düşman bul.');
            if (player.stamina < 10) return msg.reply('💨 Yorgunsun!');
            const weapon = player.weapons[player.activeWeaponIndex] || player.weapons[0];
            if (weapon.type === 'ranged') {
                const ammoType = weapon.ammoType;
                if (player.ammo[ammoType] < (weapon.ammoPerShot || 1))
                    return msg.reply(`🔫 Yeterli mermin yok! Marketten al.`);
                updateUser(msg.author.id, { ammo: { ...player.ammo, [ammoType]: player.ammo[ammoType] - (weapon.ammoPerShot || 1) } });
                player = getUserData(msg.author.id);
            }
            let damage = weapon.damage + Math.floor(Math.random() * 20) + (player.power * 3);
            const isCritical = Math.random() < 0.15;
            if (isCritical) damage *= 2;
            let stun = false;
            if (weapon.effect === 'ezme' && Math.random() < 0.4) stun = true;
            const newEnemyHealth = Math.max(0, player.currentEnemy.health - damage);
            const kill = newEnemyHealth <= 0;
            let playerDamage = 0, playerNewHealth = player.health;
            if (!kill && !stun) {
                playerDamage = Math.floor(Math.random() * player.currentEnemy.damage) + 5;
                playerNewHealth = Math.max(0, player.health - playerDamage);
            }
            let newDur = weapon.durability - 1;
            let weaponsList = [...player.weapons];
            let broken = false;
            if (newDur <= 0) { weaponsList.splice(player.activeWeaponIndex, 1); broken = true; if (weaponsList.length) updateUser(msg.author.id, { activeWeaponIndex: 0 }); }
            else { weaponsList[player.activeWeaponIndex] = { ...weapon, durability: newDur }; }
            let xpGain = 0, scrapGain = 0, drop = null;
            if (kill) {
                xpGain = player.currentEnemy.xp;
                scrapGain = player.currentEnemy.scrap;
                const zoneLevel = getZoneLevel(player.activeZone);
                drop = getDropFromEnemy(zoneLevel);
                const newInv = [...player.inventory];
                const existing = newInv.find(i => i.name === drop.name);
                if (existing) existing.amount += drop.amount;
                else newInv.push({ name: drop.name, amount: drop.amount, type: drop.type, emoji: drop.icon, craftMaterial: drop.craftMaterial });
                updateUser(msg.author.id, { inventory: newInv });
            }
            const updates = {
                stamina: Math.max(0, player.stamina - 12),
                weapons: weaponsList,
                kills: player.kills + (kill ? 1 : 0),
                exp: player.exp + xpGain,
                scraps: player.scraps + scrapGain,
                health: playerNewHealth,
                currentEnemy: kill ? null : { ...player.currentEnemy, health: newEnemyHealth }
            };
            if (broken) updates.activeWeaponIndex = 0;
            updateUser(msg.author.id, updates);
            
            // CAN ÇUBUĞU HESAPLAMA
            const enemyHpPercent = kill ? 0 : (newEnemyHealth / player.currentEnemy.maxHealth) * 100;
            const enemyHpBar = !kill ? '🟥'.repeat(Math.floor(enemyHpPercent / 10)) + '⬛'.repeat(10 - Math.floor(enemyHpPercent / 10)) : '💀 ÖLÜ';
            const playerHpPercent = (playerNewHealth / player.maxHealth) * 100;
            const playerHpBar = '🟥'.repeat(Math.floor(playerHpPercent / 10)) + '⬛'.repeat(10 - Math.floor(playerHpPercent / 10));
            
            const embed = new EmbedBuilder()
                .setTitle(kill ? '⚔️ ZAFER!' : '💢 VURDUN!')
                .setDescription(`${player.currentEnemy.name} ile savaştın!`)
                .setColor(kill ? 0x44ff44 : 0xffaa44)
                .setImage(player.currentEnemy.image)
                .addFields(
                    { name: '🗡️ HASAR', value: `${damage} ${isCritical ? '(KRİTİK!)' : ''}`, inline: true },
                    { name: '❤️ DÜŞMAN CANI', value: kill ? 'ÖLDÜ' : `${enemyHpBar} (${newEnemyHealth}/${player.currentEnemy.maxHealth})`, inline: false },
                    { name: '❤️ SENİN CANIN', value: `${playerHpBar} (${playerNewHealth}/${player.maxHealth})`, inline: false },
                    { name: '🔫 SİLAH', value: `${weapon.emoji || '⚔️'} ${weapon.name} (${weapon.effectDesc})`, inline: false },
                    { name: '🔧 DURUM', value: broken ? 'KIRILDI!' : `Dayanıklılık ${newDur}/${weapon.maxDurability}`, inline: true }
                );
            if (!kill && !stun) embed.addFields({ name: '🧟 DÜŞMAN SALDIRISI', value: `${playerDamage} hasar!`, inline: false });
            if (kill && drop) embed.addFields({ name: '🎁 DROP', value: `${drop.icon} ${drop.name} x${drop.amount}`, inline: false });
            await msg.reply({ embeds: [embed] });
            if (playerNewHealth <= 0) {
                updateUser(msg.author.id, { health: Math.floor(player.maxHealth * 0.6), deaths: player.deaths + 1, scraps: Math.max(0, player.scraps - Math.floor(player.scraps * 0.1)), currentEnemy: null });
                await msg.reply({ embeds: [new EmbedBuilder().setTitle('💀 ÖLDÜN!').setDescription('Sığınakta dirildin.').setImage(IMAGES.death)] });
            }
        });
    }

    // ---------- BLOK ----------
    else if (cmd === 'blok') {
        await handleCommand(message, 'blok', async (msg) => {
            if (!player.currentEnemy || player.currentEnemy.health <= 0) return msg.reply('❌ Savaşta değilsin.');
            if (player.stamina < 15) return msg.reply('💨 Yetersiz dayanıklılık.');
            const success = Math.random() < (0.7 + player.agility * 0.03);
            if (success) {
                updateUser(msg.author.id, { stamina: Math.max(0, player.stamina - 15) });
                await msg.reply('🛡️ **BLOK BAŞARILI!** Düşman saldırısı engellendi.');
            } else {
                const damage = Math.floor(Math.random() * player.currentEnemy.damage) + 5;
                const newHealth = Math.max(0, player.health - damage);
                updateUser(msg.author.id, { health: newHealth, stamina: Math.max(0, player.stamina - 15) });
                await msg.reply(`💢 **BLOK BAŞARISIZ!** ${damage} hasar aldın. (${newHealth}/${player.maxHealth})`);
                if (newHealth <= 0) {
                    updateUser(msg.author.id, { health: Math.floor(player.maxHealth * 0.6), deaths: player.deaths + 1, scraps: Math.max(0, player.scraps - Math.floor(player.scraps * 0.1)), currentEnemy: null });
                    await msg.reply({ embeds: [new EmbedBuilder().setTitle('💀 ÖLDÜN!').setDescription('Sığınakta dirildin.').setImage(IMAGES.death)] });
                }
            }
        });
    }

    // ---------- KAÇ ----------
    else if (cmd === 'kac') {
        await handleCommand(message, 'kac', async (msg) => {
            if (!player.currentEnemy || player.currentEnemy.health <= 0) return msg.reply('❌ Savaşta değilsin.');
            if (player.stamina < 20) return msg.reply('💨 Yorgunsun, kaçamazsın.');
            const success = Math.random() < (0.5 + player.agility * 0.05);
            if (success) {
                updateUser(msg.author.id, { stamina: Math.max(0, player.stamina - 20), currentEnemy: null });
                await msg.reply('🏃‍♂️ **KAÇTIN!** Düşmandan kurtuldun.');
            } else {
                const damage = Math.floor(Math.random() * player.currentEnemy.damage) + 10;
                const newHealth = Math.max(0, player.health - damage);
                updateUser(msg.author.id, { health: newHealth, stamina: Math.max(0, player.stamina - 15) });
                await msg.reply(`💢 **KAÇAMADIN!** ${damage} hasar aldın. (${newHealth}/${player.maxHealth})`);
                if (newHealth <= 0) {
                    updateUser(msg.author.id, { health: Math.floor(player.maxHealth * 0.6), deaths: player.deaths + 1, scraps: Math.max(0, player.scraps - Math.floor(player.scraps * 0.1)), currentEnemy: null });
                    await msg.reply({ embeds: [new EmbedBuilder().setTitle('💀 ÖLDÜN!').setDescription('Sığınakta dirildin.').setImage(IMAGES.death)] });
                }
            }
        });
    }

    // ---------- İYİLEŞTİR ----------
    else if (cmd === 'iyilestir') {
        await handleCommand(message, 'iyilestir', async (msg) => {
            const healItem = player.inventory.find(i => i.type === 'heal');
            if (!healItem) return msg.reply('❌ İyileşme eşyan yok!');
            const newHealth = Math.min(player.maxHealth, player.health + healItem.heal);
            const newInv = [...player.inventory];
            const idx = newInv.findIndex(i => i.name === healItem.name);
            newInv[idx].amount--;
            if (newInv[idx].amount <= 0) newInv.splice(idx, 1);
            updateUser(msg.author.id, { health: newHealth, inventory: newInv });
            await msg.reply(`💊 **${healItem.name}** kullandın! +${healItem.heal} can (${newHealth}/${player.maxHealth})`);
        });
    }

    // ---------- SIĞINAK ----------
    else if (cmd === 'sığınak') {
        await handleCommand(message, 'sığınak', async (msg) => {
            const safe = SAFE_ZONES.find(z => z.name === player.activeSafeZone) || SAFE_ZONES[0];
            const newHealth = Math.min(player.maxHealth, player.health + safe.healBonus);
            const newStamina = Math.min(100, player.stamina + safe.staminaBonus);
            const newInfection = Math.max(0, player.infection - safe.infectionReduction);
            updateUser(msg.author.id, { health: newHealth, stamina: newStamina, infection: newInfection });
            await msg.reply(`🏠 **${player.activeSafeZone}**'nda dinlendin! +${safe.healBonus} can, +${safe.staminaBonus} dayanıklılık, -${safe.infectionReduction}% enfeksiyon.`);
        });
    }

    // ---------- SAFE ZONE ----------
    else if (cmd === 'safezone') {
        await handleCommand(message, 'safezone', async (msg) => {
            if (args[0] === 'satın al') {
                const zoneName = args.slice(1).join(' ');
                const zone = SAFE_ZONES.find(z => z.name.toLowerCase().includes(zoneName.toLowerCase()));
                if (!zone) return msg.reply('❌ Geçersiz safe zone.');
                if (player.ownedSafeZones.includes(zone.name)) return msg.reply('✅ Zaten sahipsin.');
                if (player.scraps < zone.price) return msg.reply(`❌ ${zone.price}💰 gerekli.`);
                updateUser(msg.author.id, { scraps: player.scraps - zone.price, ownedSafeZones: [...player.ownedSafeZones, zone.name] });
                await msg.reply(`🏠 **${zone.name}** satın aldın!`);
            } else {
                let list = '';
                for (const z of SAFE_ZONES) {
                    const owned = player.ownedSafeZones.includes(z.name) ? '✅' : '🔒';
                    list += `${owned} **${z.name}** - ${z.price}💰 (Can+${z.healBonus}, Stam+${z.staminaBonus})\n`;
                }
                const embed = new EmbedBuilder().setTitle('🏠 SAFE ZONE LİSTESİ').setDescription(list).setColor(0xffaa44).setImage(IMAGES.safezone);
                await msg.reply({ embeds: [embed] });
            }
        });
    }

    // ---------- AKTİF SAFE ZONE ----------
    else if (cmd === 'aktif_safe') {
        await handleCommand(message, 'aktif_safe', async (msg) => {
            const zoneName = args.join(' ');
            const zone = SAFE_ZONES.find(z => z.name.toLowerCase().includes(zoneName.toLowerCase()));
            if (!zone) return msg.reply('❌ Geçersiz safe zone.');
            if (!player.ownedSafeZones.includes(zone.name)) return msg.reply('❌ Bu safe zone\'a sahip değilsin.');
            updateUser(msg.author.id, { activeSafeZone: zone.name });
            await msg.reply(`🏠 **${zone.name}** aktif safe zone seçildi.`);
        });
    }

    // ---------- MARKET ----------
    else if (cmd === 'market') {
        await handleCommand(message, 'market', async (msg) => {
            let marketText = '';
            for (const [cat, items] of Object.entries(MARKET_ITEMS)) {
                marketText += `**${cat.toUpperCase()}**\n${items.map(i => `${i.emoji} ${i.name} - ${i.price}💰`).join('\n')}\n\n`;
            }
            const embed = new EmbedBuilder()
                .setTitle('🏪 HARRAN KARABORSASI')
                .setDescription(marketText)
                .setImage(IMAGES.trader)
                .setColor(0xffaa44)
                .setFooter({ text: '!al [ürün] ile satın al | !sat [eşya] ile sat' });
            await msg.reply({ embeds: [embed] });
        });
    }

    // ---------- AL ----------
    else if (cmd === 'al') {
        await handleCommand(message, 'al', async (msg) => {
            const query = args.join(' ').toLowerCase();
            let selected = null;
            for (const cat of Object.values(MARKET_ITEMS)) {
                const found = cat.find(i => i.name.toLowerCase() === query);
                if (found) { selected = found; break; }
            }
            if (!selected) return msg.reply('❌ Geçersiz ürün. `!market` ile listeye bak.');
            if (player.scraps < selected.price) return msg.reply(`❌ ${selected.price}💰 gerekli.`);
            const invCount = getInventoryCount(player.inventory);
            if (invCount + 1 > player.inventorySlots) return msg.reply(`❌ Envanter dolu! (${invCount}/${player.inventorySlots})`);
            if (selected.item.type === 'weapon') {
                updateUser(msg.author.id, { scraps: player.scraps - selected.price, weapons: [selected.item, ...player.weapons] });
            } else if (selected.item.type === 'ammo') {
                const newAmmo = { ...player.ammo, [selected.item.ammoType]: player.ammo[selected.item.ammoType] + selected.item.amount };
                updateUser(msg.author.id, { scraps: player.scraps - selected.price, ammo: newAmmo });
            } else {
                const newInv = [...player.inventory];
                const existing = newInv.find(i => i.name === selected.item.name);
                if (existing) existing.amount += (selected.item.amount || 1);
                else newInv.push({ ...selected.item, emoji: selected.emoji });
                updateUser(msg.author.id, { scraps: player.scraps - selected.price, inventory: newInv });
            }
            await msg.reply(`✅ **${selected.emoji} ${selected.name}** satın aldın! -${selected.price}💰`);
        });
    }

    // ---------- SAT ----------
    else if (cmd === 'sat') {
        await handleCommand(message, 'sat', async (msg) => {
            if (args[0] === 'hurda') {
                const amount = parseInt(args[1]) || 10;
                if (player.scraps < amount) return msg.reply(`❌ ${amount} hurda yok.`);
                updateUser(msg.author.id, { scraps: player.scraps - amount });
                return msg.reply(`💰 ${amount} hurda sattın! +${amount}💰`);
            }
            const sellable = { 'bandaj': 5, 'medkit': 10 };
            const price = sellable[args[0]?.toLowerCase()];
            if (!price) return msg.reply('❌ Satılabilecekler: bandaj, medkit, hurda');
            const idx = player.inventory.findIndex(i => i.name.toLowerCase().includes(args[0]));
            if (idx === -1) return msg.reply('❌ Envanterde yok.');
            const newInv = [...player.inventory];
            newInv[idx].amount--;
            if (newInv[idx].amount <= 0) newInv.splice(idx, 1);
            updateUser(msg.author.id, { inventory: newInv, scraps: player.scraps + price });
            await msg.reply(`💰 1x ${args[0]} sattın! +${price}💰`);
        });
    }

    // ---------- CRAFT ----------
    else if (cmd === 'craft') {
        await handleCommand(message, 'craft', async (msg) => {
            if (!args[0]) {
                const recipeList = Object.entries(CRAFT_RECIPES).map(([key, val]) => `• ${key}: ${Object.entries(val.materials).map(([m, a]) => `${a} ${m}`).join(', ')} - ${val.cost}💰`).join('\n');
                const embed = new EmbedBuilder().setTitle('🛠️ CRAFT TARİFLERİ').setDescription(recipeList).setImage(IMAGES.blueprint).setColor(0xffaa44);
                return msg.reply({ embeds: [embed] });
            }
            const recipe = CRAFT_RECIPES[args[0].toLowerCase()];
            if (!recipe) return msg.reply('❌ Geçersiz tarif.');
            let hasMaterials = true;
            for (const [mat, needed] of Object.entries(recipe.materials)) {
                const invItem = player.inventory.find(i => i.name === mat);
                if (!invItem || invItem.amount < needed) hasMaterials = false;
            }
            if (!hasMaterials) return msg.reply('❌ Yeterli malzemen yok.');
            if (player.scraps < recipe.cost) return msg.reply(`❌ ${recipe.cost}💰 gerekli.`);
            let newInv = [...player.inventory];
            for (const [mat, needed] of Object.entries(recipe.materials)) {
                const idx = newInv.findIndex(i => i.name === mat);
                newInv[idx].amount -= needed;
                if (newInv[idx].amount <= 0) newInv.splice(idx, 1);
            }
            const existing = newInv.find(i => i.name === recipe.result.name);
            if (existing) existing.amount += recipe.result.amount;
            else newInv.push({ ...recipe.result, emoji: recipe.result.emoji });
            updateUser(msg.author.id, { scraps: player.scraps - recipe.cost, inventory: newInv });
            await msg.reply(`✅ **${recipe.result.emoji} ${recipe.result.name}** ürettin! -${recipe.cost}💰`);
        });
    }

    // ---------- YÜKSELT ----------
    else if (cmd === 'yükselt') {
        await handleCommand(message, 'yükselt', async (msg) => {
            const skills = { 'güç': { key: 'power', desc: 'Hasar +3', cost: 100 }, 'çeviklik': { key: 'agility', desc: 'Dayanıklılık -5%', cost: 100 } };
            const skill = skills[args[0]?.toLowerCase()];
            if (!skill) return msg.reply('❌ Yükselt: güç, çeviklik');
            if (player[skill.key] >= 10) return msg.reply('❌ Maksimum seviye.');
            if (player.scraps < skill.cost) return msg.reply(`❌ ${skill.cost}💰 gerekli.`);
            updateUser(msg.author.id, { [skill.key]: player[skill.key] + 1, scraps: player.scraps - skill.cost });
            await msg.reply(`✅ **${args[0].toUpperCase()}** seviye ${player[skill.key]+1} oldu! ${skill.desc}`);
        });
    }

    // ---------- GECE / GÜNDÜZ ----------
    else if (cmd === 'gece') {
        await handleCommand(message, 'gece', async (msg) => {
            if (player.isNight) return msg.reply('🌙 Zaten gece.');
            updateUser(msg.author.id, { isNight: true });
            await msg.reply({ embeds: [new EmbedBuilder().setTitle('🌙 GECE OLDU!').setDescription('Düşmanlar güçlendi, XP 1.5x').setColor(0x331166).setImage(IMAGES.night)] });
        });
    }
    else if (cmd === 'gündüz') {
        await handleCommand(message, 'gündüz', async (msg) => {
            if (!player.isNight) return msg.reply('☀️ Zaten gündüz.');
            updateUser(msg.author.id, { isNight: false });
            await msg.reply({ embeds: [new EmbedBuilder().setTitle('☀️ GÜNDÜZ OLDU!').setDescription('Daha güvenli.').setColor(0xffaa44).setImage(IMAGES.day)] });
        });
    }

    // ---------- HARİTA ----------
    else if (cmd === 'harita') {
        await handleCommand(message, 'harita', async (msg) => {
            const embed = new EmbedBuilder().setTitle('🗺️ HARRAN HARİTASI').addFields(
                { name: '🏚️ Gecekondu (Lv1)', value: 'Başlangıç', inline: true },
                { name: '🏛️ Eski Şehir (Lv3)', value: 'Orta', inline: true },
                { name: '📡 Anten Tepesi (Lv5)', value: 'Zor', inline: true }
            ).setColor(0x44aaff).setImage(IMAGES.safezone);
            await msg.reply({ embeds: [embed] });
        });
    }

    // ---------- GİT ----------
    else if (cmd === 'git') {
        await handleCommand(message, 'git', async (msg) => {
            const zoneMap = { 'gecekondu':'🏚️ Gecekondu', 'eski şehir':'🏛️ Eski Şehir', 'anten':'📡 Anten Tepesi' };
            const zoneName = zoneMap[args.join(' ').toLowerCase()];
            if (!zoneName) return msg.reply('❌ Bölgeler: Gecekondu, Eski Şehir, Anten');
            const zone = ZONES.find(z => z.name === zoneName);
            if (player.level < zone.level) return msg.reply(`❌ Seviye ${zone.level} gerekli.`);
            updateUser(msg.author.id, { activeZone: zoneName });
            await msg.reply(`🗺️ **${zone.name}** bölgesine gittin!`);
        });
    }

    // ---------- BAŞARILAR ----------
    else if (cmd === 'başarılar') {
        await handleCommand(message, 'başarılar', async (msg) => {
            const achList = [
                { name:'🌟 İlk Katil', req:1, type:'kills', reward:50 },
                { name:'⚔️ Savaşçı', req:50, type:'kills', reward:200 },
                { name:'💰 Zengin', req:500, type:'scraps', reward:150 },
                { name:'🧱 Güçlü', req:5, type:'level', reward:200 }
            ];
            let completed = [], locked = [];
            for (const a of achList) {
                const prog = a.type === 'kills' ? player.kills : a.type === 'scraps' ? player.totalScraps : player.level;
                if (prog >= a.req) {
                    completed.push(`✅ ${a.name}`);
                    if (!player.achievements.includes(a.name)) {
                        player.achievements.push(a.name);
                        updateUser(msg.author.id, { achievements: player.achievements, scraps: player.scraps + a.reward });
                    }
                } else {
                    locked.push(`🔒 ${a.name} (${prog}/${a.req})`);
                }
            }
            const embed = new EmbedBuilder().setTitle(`🏆 ${msg.author.username} - BAŞARILAR`).setDescription(`**Kazanılan:**\n${completed.join('\n')||'Yok'}\n\n**Kilitli:**\n${locked.join('\n')||'Tamamlandı!'}`).setColor(0xffd700).setImage(IMAGES.levelup);
            await msg.reply({ embeds: [embed] });
        });
    }

    // ---------- GÖREVLER ----------
    else if (cmd === 'görevler') {
        await handleCommand(message, 'görevler', async (msg) => {
            const quests = [
                { name:'⚔️ Günlük Av', prog: player.dailyKills, target: 10, reward: 100 },
                { name:'🔍 Kaşif', prog: player.dailyExplore, target: 5, reward: 75 }
            ];
            let text = '', total = 0;
            for (const q of quests) {
                const complete = q.prog >= q.target;
                text += `${complete ? '✅' : '📜'} ${q.name} (${q.prog}/${q.target}) - ${q.reward}💰\n`;
                if (complete && !player.completedQuests.includes(q.name)) {
                    total += q.reward;
                    player.completedQuests.push(q.name);
                }
            }
            if (total > 0) updateUser(msg.author.id, { completedQuests: player.completedQuests, scraps: player.scraps + total, dailyKills: 0, dailyExplore: 0 });
            const embed = new EmbedBuilder().setTitle('📜 GÜNLÜK GÖREVLER').setDescription(text).setColor(0x44aaff).setImage(IMAGES.profile);
            await msg.reply({ embeds: [embed] });
        });
    }

    // ---------- RANK ----------
    else if (cmd === 'rank') {
        await handleCommand(message, 'rank', async (msg) => {
            const all = loadData();
            const sorted = Object.values(all).sort((a,b) => b.level - a.level || b.kills - a.kills);
            const rank = sorted.findIndex(p => p.userId === msg.author.id) + 1;
            const top5 = sorted.slice(0,5).map((p,i) => `${i+1}. **${p.username}** - Lv${p.level} | ${p.kills} kill`).join('\n');
            const embed = new EmbedBuilder().setTitle('🏆 LİDERLİK').setDescription(`**Sıralaman:** #${rank}/${sorted.length}`).addFields({name:'👑 İLK 5', value: top5 || 'Yok'}, {name:'📊 İSTATİSTİKLERİN', value: `Seviye: ${player.level}\nÖldürme: ${player.kills}\nToplam Hurda: ${player.totalScraps}`}).setColor(0xffd700).setThumbnail(IMAGES.profile);
            await msg.reply({ embeds: [embed] });
        });
    }

    // ---------- BLUEPRINT ----------
    else if (cmd === 'blueprint') {
        await handleCommand(message, 'blueprint', async (msg) => {
            const embed = new EmbedBuilder().setTitle('📜 BLUEPRINTLERİN').setDescription(player.blueprints.map(b => `📜 ${b}`).join('\n') || 'Yok').setColor(0x44aaff).setImage(IMAGES.blueprint);
            await msg.reply({ embeds: [embed] });
        });
    }

    // ---------- BİLGİ ----------
    else if (cmd === 'bilgi') {
        await handleCommand(message, 'bilgi', async (msg) => {
            const all = loadData();
            const embed = new EmbedBuilder()
                .setTitle('ℹ️ DYING LIGHT BOT')
                .setDescription('**v9.0 - Ultimate Edition**')
                .addFields(
                    { name: '👥 TOPLAM OYUNCU', value: `${Object.keys(all).length}`, inline: true },
                    { name: '⚔️ TOPLAM ÖLDÜRME', value: `${Object.values(all).reduce((s,p)=>s+p.kills,0)}`, inline: true },
                    { name: '🤖 YAPIMCI', value: '**@wh01.exe**', inline: true },
                    { name: '🛠️ ÖZELLİKLER', value: 'Menzilli silahlar, mermi, yeni lootlar, craft, market, slash komutlar, admin panel', inline: false }
                )
                .setColor(0x44aaff)
                .setThumbnail(IMAGES.profile);
            await msg.reply({ embeds: [embed] });
        });
    }

    // ---------- ADMIN PANEL ----------
    else if (cmd === 'admin') {
        if (!isOwner(message.author.id)) return msg.reply('❌ Bu komut sadece bot sahibi içindir.');
        await handleCommand(message, 'admin', async (msg) => {
            if (args[0] === 'ver' && args[1]) {
                const target = msg.mentions.users.first();
                if (!target) return msg.reply('❌ Kullanıcı etiketle.');
                const amount = parseInt(args[2]) || 100;
                updateUser(target.id, { scraps: player.scraps + amount });
                await msg.reply(`✅ ${target.username} adlı kullanıcıya ${amount}💰 verildi.`);
            } else if (args[0] === 'sıfırla') {
                const all = loadData();
                for (const uid in all) all[uid] = defaultData(uid, all[uid].username);
                saveData(all);
                await msg.reply('✅ Tüm veriler sıfırlandı.');
            } else if (args[0] === 'istatistik') {
                const all = loadData();
                const totalKills = Object.values(all).reduce((s,p)=>s+p.kills,0);
                const totalPlayers = Object.keys(all).length;
                const avgLevel = totalPlayers ? (Object.values(all).reduce((s,p)=>s+p.level,0)/totalPlayers).toFixed(1) : 0;
                await msg.reply(`📊 **İSTATİSTİKLER**\nToplam oyuncu: ${totalPlayers}\nToplam öldürme: ${totalKills}\nOrtalama seviye: ${avgLevel}`);
            } else {
                await msg.reply('👑 **ADMIN KOMUTLARI**\n`!admin ver @kullanıcı [miktar]`\n`!admin sıfırla`\n`!admin istatistik`');
            }
        });
    }

    else { await message.reply('❌ Bilinmeyen komut. `!yardim`'); }

    // Seviye atlama
    const expNeeded = player.level * 100;
    if (player.exp >= expNeeded) {
        const newLevel = player.level + 1;
        updateUser(message.author.id, { level: newLevel, exp: player.exp - expNeeded, maxHealth: player.maxHealth + 20, health: player.maxHealth + 20, scraps: player.scraps + 100, inventorySlots: player.inventorySlots + 2 });
        await message.reply({ embeds: [new EmbedBuilder().setTitle('🎉 SEVİYE ATLADIN!').setDescription(`Seviye ${newLevel}! +100💰, +2 envanter`).setImage(IMAGES.levelup)] });
    }
    if (player.infection >= 100) {
        updateUser(message.author.id, { infection: 50, health: Math.max(0, player.health - 30), deaths: player.deaths + 1 });
        await message.reply({ embeds: [new EmbedBuilder().setTitle('🧟 ENFEKSİYON KRİZİ!').setDescription('-30 can').setImage(IMAGES.volatile)] });
    }
});

// ======================= SLASH KOMUTLARI =======================
const slashCommandsList = [
    new SlashCommandBuilder().setName('profil').setDescription('Profilini gösterir'),
    new SlashCommandBuilder().setName('envanter').setDescription('Envanterini gösterir'),
    new SlashCommandBuilder().setName('kesfet').setDescription('Düşman bul'),
    new SlashCommandBuilder().setName('saldir').setDescription('Düşmana saldır'),
    new SlashCommandBuilder().setName('market').setDescription('Market'),
    new SlashCommandBuilder().setName('craft').setDescription('Üretim yap'),
    new SlashCommandBuilder().setName('bilgi').setDescription('Bot bilgisi'),
    new SlashCommandBuilder().setName('rank').setDescription('Liderlik tablosu'),
    new SlashCommandBuilder().setName('ogretici').setDescription('Oyun rehberi')
];
const restClient = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        await restClient.put(Routes.applicationCommands(CLIENT_ID), { body: slashCommandsList.map(cmd => cmd.toJSON()) });
        console.log('✅ Slash komutlar yüklendi.');
    } catch(e) { console.error('Slash yüklenemedi:', e); }
})();

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    const { commandName, user } = interaction;
    let player = getUserData(user.id, user.username);
    if (commandName === 'profil') {
        const embed = new EmbedBuilder().setTitle(`🧟 ${user.username}`).setDescription(`Seviye ${player.level} | ${player.kills} öldürme`).setImage(IMAGES.profile);
        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'envanter') {
        const invList = player.inventory.map(i => `${i.emoji || '📦'} ${i.name} x${i.amount}`).join('\n');
        await interaction.reply(`📦 **Envanterin:**\n${invList || 'Boş'}\n💰 Hurda: ${player.scraps}`);
    } else if (commandName === 'kesfet') {
        if (player.stamina < 15) return interaction.reply('💨 Yorgunsun!');
        const zoneLevel = getZoneLevel(player.activeZone);
        const enemy = getEnemy(player.isNight, zoneLevel);
        updateUser(user.id, { currentEnemy: enemy, stamina: Math.max(0, player.stamina - 10) });
        await interaction.reply(`👀 **${enemy.name}** buldun! Can: ${enemy.health}/${enemy.maxHealth}, Hasar: ${enemy.damage}. \`/saldir\` ile savaş.`);
    } else if (commandName === 'saldir') {
        if (!player.currentEnemy || player.currentEnemy.health <= 0) return interaction.reply('Önce `/kesfet` ile düşman bul.');
        const weapon = player.weapons[player.activeWeaponIndex] || player.weapons[0];
        let damage = weapon.damage + Math.floor(Math.random() * 20) + (player.power * 3);
        const kill = (player.currentEnemy.health - damage) <= 0;
        let msg = `🗡️ **${weapon.name}** ile ${damage} hasar vurdun! `;
        if (kill) {
            const xpGain = player.currentEnemy.xp;
            const scrapGain = player.currentEnemy.scrap;
            updateUser(user.id, { exp: player.exp + xpGain, scraps: player.scraps + scrapGain, kills: player.kills + 1, currentEnemy: null, stamina: Math.max(0, player.stamina - 12) });
            msg += `Düşman öldü! +${xpGain} XP, +${scrapGain}💰`;
        } else {
            const newHealth = player.currentEnemy.health - damage;
            updateUser(user.id, { currentEnemy: { ...player.currentEnemy, health: newHealth }, stamina: Math.max(0, player.stamina - 12) });
            msg += `Düşman canı: ${newHealth}/${player.currentEnemy.maxHealth}`;
        }
        await interaction.reply(msg);
    } else if (commandName === 'market') {
        let text = '';
        for (const cat of Object.values(MARKET_ITEMS)) text += cat.map(i => `${i.emoji} ${i.name} - ${i.price}💰`).join('\n') + '\n\n';
        await interaction.reply(`🏪 **MARKET**\n${text}\n\`/al <ürün>\` ile satın al.`);
    } else if (commandName === 'craft') {
        await interaction.reply('🛠️ Craft için `!craft` kullan (henüz slash desteklenmiyor).');
    } else if (commandName === 'bilgi') {
        await interaction.reply(`🤖 **DYING LIGHT BOT**\nYapımcı: @wh01.exe\nSürüm: v9.0\nKomutlar: /profil, /envanter, /kesfet, /saldir, /market, /rank, /ogretici`);
    } else if (commandName === 'rank') {
        const all = loadData();
        const sorted = Object.values(all).sort((a,b) => b.level - a.level);
        const rank = sorted.findIndex(p => p.userId === user.id) + 1;
        await interaction.reply(`🏆 **Sıralaman:** #${rank}/${sorted.length}\n👑 Lider: ${sorted[0]?.username || 'Yok'} (Lv${sorted[0]?.level || 0})`);
    } else if (commandName === 'ogretici') {
        const embed = new EmbedBuilder()
            .setTitle('📚 OYNAMA REHBERİ')
            .setDescription('`!kesfet` ile düşman bul, `!saldir` ile savaş, `!market`ten eşya al, `!craft` ile üret, `!sığınak` ile iyileş. Gece daha zor ama daha çok XP!')
            .setColor(0x44aaff);
        await interaction.reply({ embeds: [embed] });
    }
});

// ======================= BOT BAŞLATMA =======================
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} giriş yaptı!`);
    console.log(`📊 ${Object.keys(loadData()).length} oyuncu`);
    console.log('🎮 Dying Light v9.0 başladı - Düşman hasarı arttırıldı, her saldırıda can çubukları gösteriliyor!');
    console.log('💡 !yardim veya /yardim');
});

client.login(TOKEN);

// ======================= PREMIUM WEB DASHBOARD (FULL EDIT MODE) =======================
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const webApp = express();
const webServer = http.createServer(webApp);
const webIo = socketIo(webServer);
const WEB_PORT = 3000;

webApp.use(express.json());
webApp.use(express.urlencoded({ extended: true }));

// PREMIUM DASHBOARD HTML - FULL EDIT MODE
const dashboardHTML = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DYING LIGHT | FULL EDIT PANEL</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Rajdhani', sans-serif;
            background: #0a0a0a;
            overflow-x: hidden;
            min-height: 100vh;
        }
        .particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            background: radial-gradient(circle at 20% 50%, rgba(255,107,53,0.15) 0%, rgba(0,0,0,0.95) 100%);
        }
        .container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }
        .premium-header {
            background: linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(255,107,53,0.2) 100%);
            backdrop-filter: blur(20px);
            border-radius: 30px;
            padding: 25px 40px;
            margin-bottom: 40px;
            border: 1px solid rgba(255,107,53,0.3);
        }
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
            margin-bottom: 20px;
        }
        .logo-area h1 {
            font-family: 'Orbitron', monospace;
            font-size: 2.5em;
            background: linear-gradient(135deg, #ff6b35, #ffd700);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        .instagram-badge {
            background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045);
            padding: 12px 25px;
            border-radius: 50px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .instagram-badge span { color: white; font-weight: bold; }
        .creator-tag { text-align: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,107,53,0.3); }
        .creator-tag span { color: #ffd700; }
        .status-grid {
            display: flex;
            justify-content: center;
            gap: 25px;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        .premium-status-card {
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(10px);
            padding: 12px 30px;
            border-radius: 60px;
            border: 1px solid rgba(255,107,53,0.4);
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .premium-status-card span { color: #ffffff !important; font-weight: bold !important; }
        .status-online { color: #00ff88 !important; text-shadow: 0 0 10px #00ff88 !important; }
        .status-live { color: #ff3366 !important; text-shadow: 0 0 10px #ff3366 !important; }
        .status-count { color: #ffd700 !important; font-size: 1.3em !important; }
        
        .stats-premium {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
        }
        .premium-stat {
            background: linear-gradient(135deg, rgba(0,0,0,0.8), rgba(255,107,53,0.15));
            backdrop-filter: blur(10px);
            border-radius: 25px;
            padding: 25px;
            text-align: center;
            border: 1px solid rgba(255,107,53,0.3);
            transition: all 0.3s;
            cursor: pointer;
        }
        .premium-stat:hover { transform: translateY(-5px); border-color: #ffd700; }
        .premium-stat i { font-size: 3em; color: #ff6b35; margin-bottom: 15px; }
        .premium-stat h3 { color: #ffd700; margin-bottom: 10px; }
        .premium-stat p { font-size: 2.5em; font-weight: bold; background: linear-gradient(135deg, #fff, #ff6b35); -webkit-background-clip: text; background-clip: text; color: transparent; }
        
        .admin-premium {
            background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(255,107,53,0.1));
            backdrop-filter: blur(20px);
            border-radius: 30px;
            padding: 30px;
            margin-bottom: 40px;
        }
        .admin-premium h2 { color: #ffd700; margin-bottom: 25px; display: flex; align-items: center; gap: 12px; }
        .admin-controls-premium {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .control-premium {
            background: rgba(0,0,0,0.5);
            padding: 20px;
            border-radius: 20px;
            border: 1px solid rgba(255,107,53,0.3);
        }
        .control-premium label {
            display: block;
            margin-bottom: 8px;
            color: #ffd700;
            font-weight: bold;
        }
        .control-premium select, .control-premium input {
            width: 100%;
            padding: 12px;
            background: rgba(0,0,0,0.8);
            border: 1px solid #ff6b35;
            color: #fff;
            border-radius: 12px;
            margin-bottom: 10px;
        }
        .btn-premium {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #ff6b35, #ff4435);
            color: #fff;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 5px;
        }
        .btn-premium:hover { transform: scale(1.02); }
        .btn-danger { background: linear-gradient(135deg, #dc3545, #a71d2a); }
        .btn-success { background: linear-gradient(135deg, #28a745, #1e7e34); }
        
        .players-premium {
            background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(255,107,53,0.1));
            backdrop-filter: blur(20px);
            border-radius: 30px;
            padding: 30px;
            margin-bottom: 40px;
        }
        .players-premium h2 { color: #ffd700; margin-bottom: 20px; }
        .search-premium input {
            width: 100%;
            padding: 15px;
            background: rgba(0,0,0,0.8);
            border: 1px solid #ff6b35;
            color: #fff;
            border-radius: 20px;
            margin-bottom: 20px;
        }
        .table-premium { overflow-x: auto; }
        .premium-table { width: 100%; border-collapse: collapse; }
        .premium-table thead { background: linear-gradient(135deg, #ff6b35, #ff4435); }
        .premium-table th, .premium-table td { padding: 15px; text-align: left; border-bottom: 1px solid rgba(255,107,53,0.3); color: #fff; }
        .premium-table tbody tr:hover { background: rgba(255,107,53,0.2); cursor: pointer; }
        
        .detail-premium {
            background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(255,107,53,0.15));
            backdrop-filter: blur(20px);
            border-radius: 30px;
            padding: 30px;
            display: none;
            border: 2px solid rgba(255,107,53,0.5);
        }
        .detail-grid-premium {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 25px;
        }
        .detail-card-premium {
            background: rgba(0,0,0,0.6);
            padding: 20px;
            border-radius: 20px;
            border-left: 4px solid #ff6b35;
        }
        .detail-card-premium h3 { color: #ffd700; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
        .detail-card-premium p { color: #ddd; margin: 8px 0; }
        .edit-input {
            width: 100%;
            padding: 8px;
            background: rgba(0,0,0,0.8);
            border: 1px solid #ff6b35;
            color: #fff;
            border-radius: 8px;
            margin: 5px 0;
        }
        .premium-bar {
            background: rgba(255,255,255,0.1);
            height: 25px;
            border-radius: 12px;
            overflow: hidden;
            margin: 10px 0;
        }
        .premium-bar-fill { height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8em; }
        .health-fill { background: linear-gradient(90deg, #ff4444, #ff8888); }
        .stamina-fill { background: linear-gradient(90deg, #44ff44, #88ff88); }
        .infection-fill { background: linear-gradient(90deg, #8844ff, #aa88ff); }
        
        .inventory-premium, .weapons-premium {
            max-height: 200px;
            overflow-y: auto;
        }
        .inventory-item, .weapon-item {
            background: rgba(255,107,53,0.1);
            padding: 8px 12px;
            border-radius: 10px;
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .inventory-item button, .weapon-item button {
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 3px 8px;
            cursor: pointer;
        }
        .premium-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 30px;
            border-radius: 15px;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            font-weight: bold;
        }
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #ff6b35; border-radius: 10px; }
        @media (max-width: 768px) {
            .header-top { flex-direction: column; text-align: center; }
            .stats-premium { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="particles"></div>
    <div class="container">
        <div class="premium-header">
            <div class="header-top">
                <div class="logo-area">
                    <h1><i class="fas fa-skull"></i> DYING LIGHT <i class="fas fa-dragon"></i></h1>
                    <p>FULL EDIT ADMIN PANEL</p>
                </div>
                <div class="instagram-badge">
                    <i class="fab fa-instagram"></i>
                    <div><span>@wh01.exe</span><small> | Developer</small></div>
                    <i class="fas fa-check-circle" style="color: #00ff88;"></i>
                </div>
            </div>
            <div class="creator-tag">
                <span><i class="fas fa-code"></i> Developed by wh01.exe <i class="fas fa-heart" style="color: #ff3366;"></i></span>
            </div>
            <div class="status-grid">
                <div class="premium-status-card"><i class="fas fa-circle status-online"></i><span>BOT AKTİF</span></div>
                <div class="premium-status-card"><i class="fas fa-users" style="color:#ffd700;"></i><span><span id="playerCount" class="status-count">0</span> OYUNCU</span></div>
                <div class="premium-status-card"><i class="fas fa-chart-line status-live"></i><span>CANLI YAYIN</span></div>
            </div>
        </div>

        <div class="stats-premium">
            <div class="premium-stat"><i class="fas fa-user-astronaut"></i><h3>TOPLAM OYUNCU</h3><p id="totalPlayers">0</p></div>
            <div class="premium-stat"><i class="fas fa-skull-crossbones"></i><h3>TOPLAM ÖLDÜRME</h3><p id="totalKills">0</p></div>
            <div class="premium-stat"><i class="fas fa-heart-broken"></i><h3>TOPLAM ÖLÜM</h3><p id="totalDeaths">0</p></div>
            <div class="premium-stat"><i class="fas fa-chart-simple"></i><h3>ORTALAMA SEVİYE</h3><p id="avgLevel">0</p></div>
        </div>

        <div class="admin-premium">
            <h2><i class="fas fa-crown"></i> FULL EDIT KONTROL PANELİ</h2>
            <div class="admin-controls-premium">
                <div class="control-premium">
                    <label><i class="fas fa-user"></i> OYUNCU SEÇ</label>
                    <select id="playerSelect">
                        <option value="">Oyuncu seçin...</option>
                    </select>
                </div>
                <div class="control-premium">
                    <label><i class="fas fa-coins"></i> HURDA EKLE</label>
                    <input type="number" id="scrapAmount" placeholder="Miktar">
                    <button class="btn-premium" onclick="giveScraps()"><i class="fas fa-gift"></i> HURDA VER</button>
                </div>
                <div class="control-premium">
                    <label><i class="fas fa-level-up-alt"></i> SEVİYE & XP</label>
                    <input type="number" id="levelAmount" placeholder="Yeni Seviye">
                    <input type="number" id="xpAmount" placeholder="XP Miktarı">
                    <button class="btn-premium" onclick="updateLevel()"><i class="fas fa-arrow-up"></i> GÜNCELLE</button>
                </div>
                <div class="control-premium">
                    <label><i class="fas fa-heart"></i> SAĞLIK & DAYANIKLILIK</label>
                    <input type="number" id="healthAmount" placeholder="Sağlık (0-999)">
                    <input type="number" id="staminaAmount" placeholder="Dayanıklılık (0-100)">
                    <button class="btn-premium" onclick="updateHealth()"><i class="fas fa-heartbeat"></i> GÜNCELLE</button>
                </div>
                <div class="control-premium">
                    <label><i class="fas fa-star"></i> GÜÇ & ÇEVİKLİK</label>
                    <input type="number" id="powerAmount" placeholder="Güç (1-10)">
                    <input type="number" id="agilityAmount" placeholder="Çeviklik (1-10)">
                    <button class="btn-premium" onclick="updateStats()"><i class="fas fa-chart-line"></i> GÜNCELLE</button>
                </div>
                <div class="control-premium">
                    <label><i class="fas fa-store"></i> MARKET EŞYASI EKLE</label>
                    <select id="itemSelect">
                        <option value="bandaj">🩹 Bandaj</option>
                        <option value="medkit">💊 Medkit</option>
                        <option value="molotof">🔥 Molotof</option>
                        <option value="enerji">⚡ Enerji İçeceği</option>
                        <option value="hurda">💰 Hurda (50)</option>
                    </select>
                    <input type="number" id="itemAmount" placeholder="Adet">
                    <button class="btn-premium" onclick="addItem()"><i class="fas fa-plus-circle"></i> ENVANTERE EKLE</button>
                </div>
                <div class="control-premium">
                    <label><i class="fas fa-gun"></i> SİLAH EKLE</label>
                    <select id="weaponSelect">
                        <option value="Tahta Parçası">🪵 Tahta Parçası</option>
                        <option value="Boru">🔧 Boru</option>
                        <option value="Machete">🗡️ Machete</option>
                        <option value="Katana">⚔️ Katana</option>
                        <option value="Tabanca">🔫 Tabanca</option>
                        <option value="Pompalı">🔫 Pompalı</option>
                        <option value="Tüfek">🔫 Tüfek</option>
                        <option value="Kalaşnikof">🔫 Kalaşnikof</option>
                        <option value="Sniper">🎯 Sniper</option>
                    </select>
                    <button class="btn-premium" onclick="addWeapon()"><i class="fas fa-gun"></i> SİLAH EKLE</button>
                </div>
                <div class="control-premium">
                    <label><i class="fas fa-biohazard"></i> DİĞER İŞLEMLER</label>
                    <button class="btn-premium btn-danger" onclick="resetPlayer()"><i class="fas fa-trash-alt"></i> OYUNCUYU SIFIRLA</button>
                </div>
            </div>
        </div>

        <div class="players-premium">
            <h2><i class="fas fa-trophy"></i> OYUNCU LİDERLİK TABLOSU</h2>
            <div class="search-premium">
                <input type="text" id="searchInput" placeholder="🔍 Oyuncu ara...">
            </div>
            <div class="table-premium">
                <table class="premium-table">
                    <thead><tr><th>#</th><th>OYUNCU</th><th>SEVİYE</th><th>XP</th><th>ÖLDÜRME</th><th>ÖLÜM</th><th>HURDA</th></tr></thead>
                    <tbody id="playersTableBody"></tbody>
                </table>
            </div>
        </div>

        <div class="detail-premium" id="playerDetail">
            <h2><i class="fas fa-user-ninja"></i> OYUNCU DETAYI & DÜZENLE</h2>
            <div id="playerDetailContent"></div>
        </div>
    </div>

    <script>
        const socket = io();
        let players = [];
        let currentPlayer = null;
        const ADMIN_ID = '${OWNER_ID}';

        document.addEventListener('DOMContentLoaded', () => {
            loadStats();
            loadPlayers();
            document.getElementById('searchInput').addEventListener('input', filterPlayers);
        });

        socket.on('player-updated', () => { loadPlayers(); loadStats(); showNotification('✨ Oyuncu güncellendi!', 'success'); });

        async function loadStats() {
            const res = await fetch('/api/stats');
            const stats = await res.json();
            document.getElementById('totalPlayers').textContent = stats.totalPlayers;
            document.getElementById('totalKills').textContent = stats.totalKills;
            document.getElementById('totalDeaths').textContent = stats.totalDeaths;
            document.getElementById('avgLevel').textContent = stats.avgLevel;
            document.getElementById('playerCount').textContent = stats.totalPlayers;
        }

        async function loadPlayers() {
            const res = await fetch('/api/players');
            players = await res.json();
            displayPlayers(players);
            const select = document.getElementById('playerSelect');
            select.innerHTML = '<option value="">🎮 Oyuncu seçin...</option>';
            players.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.userId;
                opt.innerHTML = '<i class="fas fa-user"></i> ' + p.username + ' (Lv.' + p.level + ')';
                select.appendChild(opt);
            });
        }

        function displayPlayers(playersList) {
            const tbody = document.getElementById('playersTableBody');
            tbody.innerHTML = '';
            playersList.sort((a,b) => b.level - a.level).forEach((player, index) => {
                const row = tbody.insertRow();
                row.onclick = () => showPlayerDetail(player.userId);
                row.insertCell(0).textContent = index + 1;
                row.insertCell(1).innerHTML = '<i class="fas fa-user-circle"></i> ' + player.username;
                row.insertCell(2).innerHTML = '<i class="fas fa-star" style="color:#ffd700;"></i> ' + player.level;
                row.insertCell(3).innerHTML = '📊 ' + player.exp;
                row.insertCell(4).innerHTML = '<i class="fas fa-skull"></i> ' + player.kills;
                row.insertCell(5).innerHTML = '<i class="fas fa-heart-broken"></i> ' + player.deaths;
                row.insertCell(6).innerHTML = '<i class="fas fa-coins" style="color:#ffd700;"></i> ' + player.scraps;
            });
        }

        async function showPlayerDetail(userId) {
            const res = await fetch('/api/player/' + userId);
            currentPlayer = await res.json();
            const healthPercent = (currentPlayer.health / currentPlayer.maxHealth) * 100;
            const invCount = currentPlayer.inventory.reduce((s,i) => s + i.amount, 0);
            
            document.getElementById('playerDetailContent').innerHTML = \`
                <div class="detail-grid-premium">
                    <div class="detail-card-premium">
                        <h3><i class="fas fa-user-circle"></i> PROFİL BİLGİSİ</h3>
                        <p><strong>\${currentPlayer.username}</strong></p>
                        <p><i class="fas fa-quote-left"></i> <input type="text" id="editBio" value="\${currentPlayer.bio}" class="edit-input"></p>
                        <button class="btn-premium btn-success" onclick="updateBio()"><i class="fas fa-save"></i> BIO'YU KAYDET</button>
                    </div>
                    <div class="detail-card-premium">
                        <h3><i class="fas fa-heartbeat"></i> SAĞLIK DURUMU</h3>
                        <div class="premium-bar"><div class="premium-bar-fill health-fill" style="width: \${healthPercent}%;">\${currentPlayer.health}/\${currentPlayer.maxHealth}</div></div>
                        <p>❤️ Sağlık: <input type="number" id="editHealth" value="\${currentPlayer.health}" class="edit-input" style="width:80px;"> / \${currentPlayer.maxHealth}</p>
                        <p>🏃 Dayanıklılık: <input type="number" id="editStamina" value="\${currentPlayer.stamina}" class="edit-input" style="width:80px;"> / 100</p>
                        <p>🧟 Enfeksiyon: <input type="number" id="editInfection" value="\${currentPlayer.infection}" class="edit-input" style="width:80px;"> %</p>
                        <button class="btn-premium" onclick="updatePlayerStats()"><i class="fas fa-save"></i> KAYDET</button>
                    </div>
                    <div class="detail-card-premium">
                        <h3><i class="fas fa-chart-line"></i> İSTATİSTİKLER</h3>
                        <p>🏆 Seviye: <input type="number" id="editLevel" value="\${currentPlayer.level}" class="edit-input" style="width:80px;"></p>
                        <p>📊 XP: <input type="number" id="editExp" value="\${currentPlayer.exp}" class="edit-input" style="width:100px;"> / \${currentPlayer.level * 100}</p>
                        <p>⚔️ Güç: <input type="number" id="editPower" value="\${currentPlayer.power}" class="edit-input" style="width:80px;" min="1" max="10"></p>
                        <p>🏃 Çeviklik: <input type="number" id="editAgility" value="\${currentPlayer.agility}" class="edit-input" style="width:80px;" min="1" max="10"></p>
                        <p>⚔️ Öldürme: <input type="number" id="editKills" value="\${currentPlayer.kills}" class="edit-input" style="width:100px;"></p>
                        <p>💀 Ölüm: <input type="number" id="editDeaths" value="\${currentPlayer.deaths}" class="edit-input" style="width:100px;"></p>
                        <p>💰 Hurda: <input type="number" id="editScraps" value="\${currentPlayer.scraps}" class="edit-input" style="width:120px;"></p>
                        <button class="btn-premium" onclick="updateFullStats()"><i class="fas fa-save"></i> TÜM İSTATİSTİKLERİ KAYDET</button>
                    </div>
                    <div class="detail-card-premium">
                        <h3><i class="fas fa-backpack"></i> ENVANTER (\${invCount}/\${currentPlayer.inventorySlots})</h3>
                        <div class="inventory-premium" id="inventoryList">
                            \${currentPlayer.inventory.map((i, idx) => '<div class="inventory-item">' + (i.emoji || '📦') + ' ' + i.name + ' <strong>x' + i.amount + '</strong> <button onclick="removeInventoryItem(' + idx + ')"><i class="fas fa-trash"></i></button></div>').join('') || '<div>📭 Envanter boş</div>'}
                        </div>
                        <button class="btn-premium" onclick="refreshInventory()"><i class="fas fa-sync"></i> YENİLE</button>
                    </div>
                    <div class="detail-card-premium">
                        <h3><i class="fas fa-gun"></i> SİLAHLAR</h3>
                        <div class="weapons-premium" id="weaponsList">
                            \${currentPlayer.weapons.map((w, idx) => '<div class="weapon-item">' + (idx === currentPlayer.activeWeaponIndex ? '✅ ' : '📌 ') + (w.emoji || '⚔️') + ' <strong>' + w.name + '</strong> (Hasar: ' + w.damage + ')<br><small>' + w.effectDesc + '</small> <button onclick="removeWeapon(' + idx + ')"><i class="fas fa-trash"></i></button></div>').join('')}
                        </div>
                        <button class="btn-premium" onclick="refreshWeapons()"><i class="fas fa-sync"></i> YENİLE</button>
                    </div>
                </div>
            \`;
            document.getElementById('playerDetail').style.display = 'block';
            document.getElementById('playerDetail').scrollIntoView({ behavior: 'smooth' });
        }

        async function updateBio() {
            const newBio = document.getElementById('editBio').value;
            const res = await fetch('/api/admin/update-bio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentPlayer.userId, bio: newBio, adminId: ADMIN_ID })
            });
            const result = await res.json();
            if (result.success) { showNotification('✅ Bio güncellendi!', 'success'); showPlayerDetail(currentPlayer.userId); }
            else showNotification(result.error, 'error');
        }

        async function updatePlayerStats() {
            const health = parseInt(document.getElementById('editHealth').value);
            const stamina = parseInt(document.getElementById('editStamina').value);
            const infection = parseInt(document.getElementById('editInfection').value);
            const res = await fetch('/api/admin/update-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentPlayer.userId, health, stamina, infection, adminId: ADMIN_ID })
            });
            const result = await res.json();
            if (result.success) { showNotification('✅ Sağlık bilgileri güncellendi!', 'success'); showPlayerDetail(currentPlayer.userId); }
            else showNotification(result.error, 'error');
        }

        async function updateFullStats() {
            const level = parseInt(document.getElementById('editLevel').value);
            const exp = parseInt(document.getElementById('editExp').value);
            const power = parseInt(document.getElementById('editPower').value);
            const agility = parseInt(document.getElementById('editAgility').value);
            const kills = parseInt(document.getElementById('editKills').value);
            const deaths = parseInt(document.getElementById('editDeaths').value);
            const scraps = parseInt(document.getElementById('editScraps').value);
            const res = await fetch('/api/admin/update-full-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentPlayer.userId, level, exp, power, agility, kills, deaths, scraps, adminId: ADMIN_ID })
            });
            const result = await res.json();
            if (result.success) { showNotification('✅ Tüm istatistikler güncellendi!', 'success'); showPlayerDetail(currentPlayer.userId); loadPlayers(); loadStats(); }
            else showNotification(result.error, 'error');
        }

        async function removeInventoryItem(index) {
            const res = await fetch('/api/admin/remove-inventory-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentPlayer.userId, index, adminId: ADMIN_ID })
            });
            const result = await res.json();
            if (result.success) { showNotification('✅ Eşya silindi!', 'success'); showPlayerDetail(currentPlayer.userId); }
            else showNotification(result.error, 'error');
        }

        async function removeWeapon(index) {
            const res = await fetch('/api/admin/remove-weapon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentPlayer.userId, index, adminId: ADMIN_ID })
            });
            const result = await res.json();
            if (result.success) { showNotification('✅ Silah silindi!', 'success'); showPlayerDetail(currentPlayer.userId); }
            else showNotification(result.error, 'error');
        }

        function refreshInventory() { showPlayerDetail(currentPlayer.userId); }
        function refreshWeapons() { showPlayerDetail(currentPlayer.userId); }

        async function giveScraps() {
            const userId = document.getElementById('playerSelect').value;
            const amount = parseInt(document.getElementById('scrapAmount').value);
            if (!userId || !amount) { showNotification('❌ Oyuncu ve miktar seçin!', 'error'); return; }
            const res = await fetch('/api/admin/give-scraps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, amount, adminId: ADMIN_ID }) });
            const result = await res.json();
            if (result.success) { showNotification('💰 ' + amount + ' hurda verildi!', 'success'); loadPlayers(); loadStats(); }
            else showNotification(result.error, 'error');
        }

        async function updateLevel() {
            const userId = document.getElementById('playerSelect').value;
            const level = parseInt(document.getElementById('levelAmount').value);
            const xp = parseInt(document.getElementById('xpAmount').value);
            if (!userId) { showNotification('❌ Oyuncu seçin!', 'error'); return; }
            const res = await fetch('/api/admin/update-level', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, level, xp, adminId: ADMIN_ID }) });
            const result = await res.json();
            if (result.success) { showNotification('✅ Seviye/XP güncellendi!', 'success'); loadPlayers(); loadStats(); }
            else showNotification(result.error, 'error');
        }

        async function updateHealth() {
            const userId = document.getElementById('playerSelect').value;
            const health = parseInt(document.getElementById('healthAmount').value);
            const stamina = parseInt(document.getElementById('staminaAmount').value);
            if (!userId) { showNotification('❌ Oyuncu seçin!', 'error'); return; }
            const res = await fetch('/api/admin/update-health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, health, stamina, adminId: ADMIN_ID }) });
            const result = await res.json();
            if (result.success) { showNotification('✅ Sağlık/Day. güncellendi!', 'success'); loadPlayers(); }
            else showNotification(result.error, 'error');
        }

        async function updateStats() {
            const userId = document.getElementById('playerSelect').value;
            const power = parseInt(document.getElementById('powerAmount').value);
            const agility = parseInt(document.getElementById('agilityAmount').value);
            if (!userId) { showNotification('❌ Oyuncu seçin!', 'error'); return; }
            const res = await fetch('/api/admin/update-power-agility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, power, agility, adminId: ADMIN_ID }) });
            const result = await res.json();
            if (result.success) { showNotification('✅ Güç/Çeviklik güncellendi!', 'success'); loadPlayers(); }
            else showNotification(result.error, 'error');
        }

        async function addItem() {
            const userId = document.getElementById('playerSelect').value;
            const itemType = document.getElementById('itemSelect').value;
            const amount = parseInt(document.getElementById('itemAmount').value) || 1;
            if (!userId) { showNotification('❌ Oyuncu seçin!', 'error'); return; }
            const res = await fetch('/api/admin/add-item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, itemType, amount, adminId: ADMIN_ID }) });
            const result = await res.json();
            if (result.success) { showNotification('✅ Eşya eklendi!', 'success'); if(currentPlayer && currentPlayer.userId === userId) showPlayerDetail(userId); loadPlayers(); }
            else showNotification(result.error, 'error');
        }

        async function addWeapon() {
            const userId = document.getElementById('playerSelect').value;
            const weaponName = document.getElementById('weaponSelect').value;
            if (!userId) { showNotification('❌ Oyuncu seçin!', 'error'); return; }
            const res = await fetch('/api/admin/add-weapon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, weaponName, adminId: ADMIN_ID }) });
            const result = await res.json();
            if (result.success) { showNotification('✅ Silah eklendi!', 'success'); if(currentPlayer && currentPlayer.userId === userId) showPlayerDetail(userId); loadPlayers(); }
            else showNotification(result.error, 'error');
        }

        async function resetPlayer() {
            const userId = document.getElementById('playerSelect').value;
            if (!userId) { showNotification('❌ Oyuncu seçin!', 'error'); return; }
            if (confirm('⚠️ Bu oyuncuyu tamamen sıfırlamak istediğinize emin misiniz?')) {
                const res = await fetch('/api/admin/reset-player', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, adminId: ADMIN_ID }) });
                const result = await res.json();
                if (result.success) { showNotification('🔄 Oyuncu sıfırlandı!', 'success'); loadPlayers(); loadStats(); }
                else showNotification(result.error, 'error');
            }
        }

        function filterPlayers() {
            const term = document.getElementById('searchInput').value.toLowerCase();
            displayPlayers(players.filter(p => p.username.toLowerCase().includes(term)));
        }

        function showNotification(msg, type) {
            const notif = document.createElement('div');
            notif.className = 'premium-notification';
            notif.style.background = type === 'success' ? 'linear-gradient(135deg, #00b09b, #96c93d)' : 'linear-gradient(135deg, #ff4444, #cc0000)';
            notif.style.color = 'white';
            notif.innerHTML = '<i class="fas fa-' + (type === 'success' ? 'check-circle' : 'exclamation-circle') + '"></i> ' + msg;
            document.body.appendChild(notif);
            setTimeout(() => notif.remove(), 3000);
        }
    </script>
</body>
</html>`;

// API Routes
webApp.get('/', (req, res) => res.send(dashboardHTML));

webApp.get('/api/players', (req, res) => {
    const data = loadData();
    const players = Object.values(data).map(p => ({
        userId: p.userId, username: p.username, level: p.level, exp: p.exp,
        kills: p.kills, deaths: p.deaths, scraps: p.scraps
    }));
    res.json(players);
});

webApp.get('/api/player/:userId', (req, res) => {
    const data = loadData();
    const player = data[req.params.userId];
    if (!player) return res.status(404).json({ error: 'Oyuncu bulunamadı' });
    res.json(player);
});

webApp.post('/api/admin/give-scraps', (req, res) => {
    const { userId, amount, adminId } = req.body;
    if (adminId !== OWNER_ID) return res.status(403).json({ error: 'Yetkisiz!' });
    const data = loadData();
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu yok!' });
    data[userId].scraps += amount;
    saveData(data);
    webIo.emit('player-updated');
    res.json({ success: true });
});

webApp.post('/api/admin/update-bio', (req, res) => {
    const { userId, bio, adminId } = req.body;
    if (adminId !== OWNER_ID) return res.status(403).json({ error: 'Yetkisiz!' });
    const data = loadData();
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu yok!' });
    data[userId].bio = bio;
    saveData(data);
    webIo.emit('player-updated');
    res.json({ success: true });
});

webApp.post('/api/admin/update-stats', (req, res) => {
    const { userId, health, stamina, infection, adminId } = req.body;
    if (adminId !== OWNER_ID) return res.status(403).json({ error: 'Yetkisiz!' });
    const data = loadData();
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu yok!' });
    data[userId].health = Math.min(data[userId].maxHealth, Math.max(0, health));
    data[userId].stamina = Math.min(100, Math.max(0, stamina));
    data[userId].infection = Math.min(100, Math.max(0, infection));
    saveData(data);
    webIo.emit('player-updated');
    res.json({ success: true });
});

webApp.post('/api/admin/update-full-stats', (req, res) => {
    const { userId, level, exp, power, agility, kills, deaths, scraps, adminId } = req.body;
    if (adminId !== OWNER_ID) return res.status(403).json({ error: 'Yetkisiz!' });
    const data = loadData();
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu yok!' });
    data[userId].level = Math.max(1, level);
    data[userId].exp = Math.max(0, exp);
    data[userId].power = Math.min(10, Math.max(1, power));
    data[userId].agility = Math.min(10, Math.max(1, agility));
    data[userId].kills = Math.max(0, kills);
    data[userId].deaths = Math.max(0, deaths);
    data[userId].scraps = Math.max(0, scraps);
    data[userId].maxHealth = 100 + (data[userId].level - 1) * 20;
    if (data[userId].health > data[userId].maxHealth) data[userId].health = data[userId].maxHealth;
    saveData(data);
    webIo.emit('player-updated');
    res.json({ success: true });
});

webApp.post('/api/admin/remove-inventory-item', (req, res) => {
    const { userId, index, adminId } = req.body;
    if (adminId !== OWNER_ID) return res.status(403).json({ error: 'Yetkisiz!' });
    const data = loadData();
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu yok!' });
    data[userId].inventory.splice(index, 1);
    saveData(data);
    webIo.emit('player-updated');
    res.json({ success: true });
});

webApp.post('/api/admin/remove-weapon', (req, res) => {
    const { userId, index, adminId } = req.body;
    if (adminId !== OWNER_ID) return res.status(403).json({ error: 'Yetkisiz!' });
    const data = loadData();
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu yok!' });
    data[userId].weapons.splice(index, 1);
    if (data[userId].activeWeaponIndex >= data[userId].weapons.length) data[userId].activeWeaponIndex = 0;
    saveData(data);
    webIo.emit('player-updated');
    res.json({ success: true });
});

webApp.post('/api/admin/update-level', (req, res) => {
    const { userId, level, xp, adminId } = req.body;
    if (adminId !== OWNER_ID) return res.status(403).json({ error: 'Yetkisiz!' });
    const data = loadData();
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu yok!' });
    if (level > 0) data[userId].level = level;
    if (xp >= 0) data[userId].exp = xp;
    data[userId].maxHealth = 100 + (data[userId].level - 1) * 20;
    saveData(data);
    webIo.emit('player-updated');
    res.json({ success: true });
});

webApp.post('/api/admin/update-health', (req, res) => {
    const { userId, health, stamina, adminId } = req.body;
    if (adminId !== OWNER_ID) return res.status(403).json({ error: 'Yetkisiz!' });
    const data = loadData();
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu yok!' });
    if (health > 0) data[userId].health = Math.min(data[userId].maxHealth, health);
    if (stamina >= 0) data[userId].stamina = Math.min(100, stamina);
    saveData(data);
    webIo.emit('player-updated');
    res.json({ success: true });
});

webApp.post('/api/admin/update-power-agility', (req, res) => {
    const { userId, power, agility, adminId } = req.body;
    if (adminId !== OWNER_ID) return res.status(403).json({ error: 'Yetkisiz!' });
    const data = loadData();
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu yok!' });
    if (power >= 1 && power <= 10) data[userId].power = power;
    if (agility >= 1 && agility <= 10) data[userId].agility = agility;
    saveData(data);
    webIo.emit('player-updated');
    res.json({ success: true });
});

webApp.post('/api/admin/add-item', (req, res) => {
    const { userId, itemType, amount, adminId } = req.body;
    if (adminId !== OWNER_ID) return res.status(403).json({ error: 'Yetkisiz!' });
    const data = loadData();
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu yok!' });
    
    const items = {
        bandaj: { name: '🩹 Bandaj', type: 'heal', heal: 20, emoji: '🩹' },
        medkit: { name: '💊 Medkit', type: 'heal', heal: 60, emoji: '💊' },
        molotof: { name: '🔥 Molotof', type: 'throwable', damage: 80, emoji: '🔥' },
        enerji: { name: '⚡ Enerji İçeceği', type: 'stamina', stamina: 60, emoji: '⚡' },
        hurda: { name: '💰 Hurda', type: 'scrap', emoji: '💰' }
    };
    
    if (itemType === 'hurda') {
        data[userId].scraps += amount * 50;
    } else {
        const item = items[itemType];
        const existing = data[userId].inventory.find(i => i.name === item.name);
        if (existing) existing.amount += amount;
        else data[userId].inventory.push({ ...item, amount });
    }
    saveData(data);
    webIo.emit('player-updated');
    res.json({ success: true });
});

webApp.post('/api/admin/add-weapon', (req, res) => {
    const { userId, weaponName, adminId } = req.body;
    if (adminId !== OWNER_ID) return res.status(403).json({ error: 'Yetkisiz!' });
    const data = loadData();
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu yok!' });
    
    const ALL_WEAPONS = [
        { name: 'Tahta Parçası', emoji: '🪵', damage: 15, durability: 20, maxDurability: 20, type: 'melee', effect: 'ezme', effectDesc: 'Sersemletme' },
        { name: 'Boru', emoji: '🔧', damage: 25, durability: 25, maxDurability: 25, type: 'melee', effect: 'ezme', effectDesc: 'Yüksek sersemletme' },
        { name: 'Machete', emoji: '🗡️', damage: 45, durability: 35, maxDurability: 35, type: 'melee', effect: 'kesme', effectDesc: 'Kanama' },
        { name: 'Katana', emoji: '⚔️', damage: 70, durability: 45, maxDurability: 45, type: 'melee', effect: 'kesme', effectDesc: 'Yüksek kanama' },
        { name: 'Tabanca', emoji: '🔫', damage: 35, durability: 40, maxDurability: 40, type: 'ranged', ammoType: 'pistol', ammoPerShot: 1, effect: 'kesme', effectDesc: 'Orta menzil' },
        { name: 'Pompalı', emoji: '🔫', damage: 80, durability: 35, maxDurability: 35, type: 'ranged', ammoType: 'shotgun', ammoPerShot: 1, effect: 'ezme', effectDesc: 'Yakın yüksek hasar' },
        { name: 'Tüfek', emoji: '🔫', damage: 55, durability: 45, maxDurability: 45, type: 'ranged', ammoType: 'rifle', ammoPerShot: 1, effect: 'kesme', effectDesc: 'Hassas' },
        { name: 'Kalaşnikof', emoji: '🔫', damage: 45, durability: 50, maxDurability: 50, type: 'ranged', ammoType: 'rifle', ammoPerShot: 1, effect: 'kesme', effectDesc: 'Hızlı atış' },
        { name: 'Sniper', emoji: '🎯', damage: 120, durability: 30, maxDurability: 30, type: 'ranged', ammoType: 'sniper', ammoPerShot: 1, effect: 'delme', effectDesc: 'Çok yüksek hasar' }
    ];
    
    const weapon = ALL_WEAPONS.find(w => w.name === weaponName);
    if (weapon) {
        data[userId].weapons.push({ ...weapon });
        saveData(data);
    }
    webIo.emit('player-updated');
    res.json({ success: true });
});

webApp.post('/api/admin/reset-player', (req, res) => {
    const { userId, adminId } = req.body;
    if (adminId !== OWNER_ID) return res.status(403).json({ error: 'Yetkisiz!' });
    const data = loadData();
    if (!data[userId]) return res.status(404).json({ error: 'Oyuncu yok!' });
    data[userId] = defaultData(data[userId].userId, data[userId].username);
    saveData(data);
    webIo.emit('player-updated');
    res.json({ success: true });
});

webApp.get('/api/stats', (req, res) => {
    const data = loadData();
    const players = Object.values(data);
    res.json({
        totalPlayers: players.length,
        totalKills: players.reduce((s, p) => s + p.kills, 0),
        totalDeaths: players.reduce((s, p) => s + p.deaths, 0),
        avgLevel: players.length ? (players.reduce((s, p) => s + p.level, 0) / players.length).toFixed(1) : 0
    });
});

webIo.on('connection', (socket) => console.log('🌐 Full Edit Dashboard bağlandı'));

webServer.listen(WEB_PORT, () => {
    console.log(`✅ FULL EDIT Dashboard: http://localhost:${WEB_PORT}`);
    console.log(`👑 Admin ID: ${OWNER_ID}`);
    console.log(`📸 Instagram: @wh01.exe`);
});
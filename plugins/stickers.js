const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

// Sticker keyword map — filename: [triggers]
const STICKER_MAP = [
    {
        file: 'Thank you.webp',
        triggers: ['thanks', 'thank you', 'thx', 'ty', 'ස්තූතියි', 'stuthi', 'sthuthi', 'thankyu', 'thankyou']
    },
    {
        file: 'bye.webp',
        triggers: ['bye', 'goodbye', 'good bye', 'see you', 'see ya', 'ගිහිල්ල', 'gihill', 'bai', 'ba bye']
    },
    {
        file: 'lol.webp',
        triggers: ['lol', 'haha', 'hehe', '😂', '🤣', 'hihi', 'hahaha', 'lmao', 'lmfao']
    },
    {
        file: 'ok.webp',
        triggers: ['ok', 'okay', 'ok.', 'okk', 'okkk', 'හරි', 'hari', 'sure', 'done', 'alright', 'yep', 'yup', 'yes']
    },
    {
        file: 'sorry.webp',
        triggers: ['sorry', 'sry', 'my bad', 'සමාවෙන්න', 'samawenna', 'maaf', 'forgive']
    }
];

const STICKERS_DIR = path.join(__dirname, '..', 'Assets', 'STICKERS');

cmd({
    pattern: "sticker_auto",
    desc: "Auto sticker responder (internal trigger)",
    category: "_internal",
    filename: __filename
},
async () => {}); // placeholder — real logic below via aichat trigger interceptor

// Export the sticker handler for use in index.js
const handleStickerReply = async (hansaka, mek, from, body) => {
    if (!body || body.startsWith('.')) return false;

    const lower = body.trim().toLowerCase();

    for (const entry of STICKER_MAP) {
        const matched = entry.triggers.some(t => {
            // Exact match or surrounded by spaces/punctuation
            const regex = new RegExp(`(^|\\s|[^\\w])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[^\\w])`, 'i');
            return regex.test(lower) || lower === t;
        });

        if (matched) {
            const stickerPath = path.join(STICKERS_DIR, entry.file);
            if (fs.existsSync(stickerPath)) {
                const stickerBuffer = fs.readFileSync(stickerPath);
                await hansaka.sendMessage(from, { sticker: stickerBuffer }, { quoted: mek });
                return true; // Sticker sent
            }
        }
    }
    return false; // No match
};

module.exports = { handleStickerReply };

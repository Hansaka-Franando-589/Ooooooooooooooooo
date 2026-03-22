const { cmd } = require('../command');
const axios = require('axios');
const { si } = require('nyaapi');

const formatMsg = (title, body) => `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓓𝓮𝔁𝓮𝓻 𝓜𝓓 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 💞🐝`;

// 1. ANIME SEARCH (Jikan API - 100% Stable)
cmd({
    pattern: "animedl",
    desc: "Search anime and get details.",
    category: "downloader",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply(formatMsg("🔴 *Input Error*", "🤖 Anime එකෙහි නම ලබාදෙන්න."));
    
    try {
        await hansaka.sendMessage(from, { react: { text: "🔍", key: mek.key } });
        const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=1`);
        const anime = res.data.data[0];
        
        if (!anime) return reply(formatMsg("🔴 *Error*", "🤖 Anime එක හමු නොවීය."));

        let outText = `🟢 *Dexer MD Engine* 🤖\n\n🎬 *Title:* ${anime.title}\n🔢 *Status:* ${anime.status}\n\n📥 *Download:* .animevid ${anime.title} | 1`;
        
        await hansaka.sendMessage(from, { 
            image: { url: anime.images.jpg.large_image_url }, 
            caption: formatMsg("🎬 *Anime Found*", outText) 
        }, { quoted: mek });
        await hansaka.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        reply(formatMsg("🔴 *Error*", "සර්ච් කිරීමේදී දෝෂයක් ඇති විය."));
    }
});

// 2. TORRENT DOWNLOAD (Direct Stream Mode)
// 2. TORRENT DOWNLOAD (Optimized for Speed & Size)
cmd({
    pattern: "animevid",
    desc: "Optimized torrent stream for WhatsApp.",
    category: "downloader",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    if (!q || !q.includes('|')) return reply("උදා: .animevid Naruto | 1");
    let [name, ep] = q.split('|').map(v => v.trim());
    
    try {
        await hansaka.sendMessage(from, { react: { text: "📥", key: mek.key } });
        
        const WebTorrent = (await import('webtorrent')).default;
        const client = new WebTorrent();

        // 🟢 FIX 1: සර්ච් කරද්දීම 480p හෝ 720p ඉල්ලමු (එතකොට ඉක්මනට බාගත වෙනවා)
        const searchQuery = `${name} ${ep.padStart(2, '0')} 720p`; 
        reply(formatMsg("🔍 *Optimizing Search*", `🤖 *${name}* සඳහා WhatsApp-friendly torrent එකක් සොයමින් පවතී...`));

        const results = await si.search(searchQuery, 1);
        if (!results || results.length === 0) {
            // 720p නැත්නම් සාමාන්‍ය එකක් සොයමු
            const altResults = await si.search(`${name} ${ep.padStart(2, '0')}`, 1);
            if (!altResults || altResults.length === 0) throw new Error("Torrent එකක් හමු නොවීය.");
            var magnet = altResults[0].magnet;
        } else {
            var magnet = results[0].magnet;
        }

        client.add(magnet, (torrent) => {
            const file = torrent.files.find(f => f.name.endsWith('.mp4') || f.name.endsWith('.mkv'));
            if (!file) {
                torrent.destroy();
                return reply("වීඩියෝ ගොනුවක් හමු නොවීය.");
            }

            reply(formatMsg("🚀 *Stream Mode*", `*File:* ${file.name}\n\n🤖 වීඩියෝව දැන් පසුබිමෙන් බාගත වේ. ගොනුව විශාල නම් විනාඩි 2-5ක් පමණ ගතවිය හැක...`));

            // 🟢 FIX 2: Buffer වෙනුවට stream පාවිච්චි කරමු
            const stream = file.createReadStream();
            let chunks = [];
            
            stream.on('data', (chunk) => {
                chunks.push(chunk);
                // මෙතනදී RAM එක පිරෙනවා නම් alert එකක් දෙන්න පුළුවන්
            });
            
            stream.on('end', async () => {
                const videoBuffer = Buffer.concat(chunks);
                
                await reply(formatMsg("✅ *Done!*", "බාගත කිරීම අවසන්. දැන් WhatsApp වෙත එවමින් පවතී..."));

                await hansaka.sendMessage(from, { 
                    document: videoBuffer, 
                    mimetype: "video/mp4", 
                    fileName: `${file.name}`,
                    caption: `🎬 *${file.name}*\n\nPowered by Dexer MD 🤖.`
                }, { quoted: mek });

                torrent.destroy();
                client.destroy();
                await hansaka.sendMessage(from, { react: { text: "✅", key: mek.key } });
            });
        });

    } catch (e) {
        reply(formatMsg("🔴 *Error*", e.message));
    }
});
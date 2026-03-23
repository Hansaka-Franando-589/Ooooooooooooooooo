const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const config = require('../config');
const { sendInteractiveMessage } = require('gifted-btns');

// =============================================
// GLOBAL DESIGNS & FOOTERS
// =============================================
const FOOTER_TEXT = "𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝";
const formatMsg = (title, body) =>
    `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n\n> ${FOOTER_TEXT}`;

// Message Delete Helper
const deleteMsg = async (hansaka, from, key) => {
    try { if (key) await hansaka.sendMessage(from, { delete: key }); } catch (e) {}
};

// Config Image Buffer
const getAnimeImg = () => {
    try {
        if (config.ANIME_IMG && fs.existsSync(config.ANIME_IMG)) return fs.readFileSync(config.ANIME_IMG);
        return null;
    } catch (e) { return null; }
};

// Safe String Converter (වැදගත්ම කොටස! 🛠️)
const safeStr = (val) => {
    if (val === null || val === undefined) return "N/A";
    if (typeof val === 'object') return val.english || val.romaji || val.userPreferred || JSON.stringify(val);
    return String(val);
};

// =============================================
// API FETCHERS
// =============================================
async function searchAnimeList(query) {
    const url = `https://api.anispace.workers.dev/search/${encodeURIComponent(query)}`;
    const res = await axios.get(url, { timeout: 15000 });
    return res.data.results || res.data || [];
}

async function getEpisodes(animeId) {
    const url = `https://api.anispace.workers.dev/anime/${animeId}`;
    const res = await axios.get(url, { timeout: 15000 });
    return res.data;
}

async function getStreamLink(episodeId) {
    const url = `https://api.anispace.workers.dev/episode/${episodeId}`;
    const res = await axios.get(url, { timeout: 15000 });
    return res.data.sources || res.data;
}

function convertToMP4(streamUrl, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(streamUrl)
            .inputOptions(['-headers', 'User-Agent: Mozilla/5.0\r\n', '-protocol_whitelist', 'file,http,https,tcp,tls,crypto'])
            .outputOptions(['-c copy', '-bsf:a aac_adtstoasc', '-movflags +faststart'])
            .output(outputPath)
            .on('end', () => resolve(true))
            .on('error', (err) => reject(err))
            .run();
    });
}

// =============================================
// 1. SEARCH: .anime <name>
// =============================================
cmd({
    pattern: "anime",
    desc: "Search and Pick Anime",
    category: "downloader",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(formatMsg("🔴 *Error*", "Anime නම ලබා දෙන්න.\nඋදා: .anime Naruto"));

        await hansaka.sendMessage(from, { react: { text: "🔍", key: mek.key } });
        const statusMsg = await reply(formatMsg("🔍 *Searching...*", `"${q}" සොයමින් පවතී... ⏳`));

        const results = await searchAnimeList(q);
        if (!Array.isArray(results) || results.length === 0) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Not Found*", "සොයන නමට අදාළ කිසිවක් හමු නොවීය."));
        }

        let buttons = results.slice(0, 5).map(res => {
            if (!res) return null;
            const titleText = safeStr(res.title || res.name || "Anime");
            return {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ 
                    display_text: titleText.substring(0, 20), 
                    id: `.ainfo ${safeStr(res.id)}` 
                })
            };
        }).filter(b => b !== null);

        await deleteMsg(hansaka, from, statusMsg.key);
        const img = getAnimeImg();

        await sendInteractiveMessage(hansaka, from, {
            text: `🔍 *SEARCH RESULTS FOR:* ${q}\n\nපහත ලැයිස්තුවෙන් නිවැරදි ඇනිමේ එක තෝරන්න:`,
            footer: FOOTER_TEXT,
            image: img ? { buffer: img } : { url: results[0].image || 'https://i.ibb.co/s93hdn6L/Olya-welcome.png' },
            interactiveButtons: buttons
        });

    } catch (e) { 
        console.error(e);
        reply(formatMsg("🔴 *System Error*", e.message || "පැහැදිලි කළ නොහැකි දෝෂයකි.")); 
    }
});

// =============================================
// 2. INFO & CATEGORIES: .ainfo <id>
// =============================================
cmd({ pattern: "ainfo", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const animeId = q.trim();
        const statusMsg = await reply(formatMsg("📋 *Loading Info...*", "ඇනිමේ විස්තර ලබාගනිමින් පවතී..."));

        const info = await getEpisodes(animeId);
        
        // 🛠️ FIX: Relaxed Validation Check (Checks for error, but allows missing title if name exists)
        if (!info || info.error) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Not Found*", "ඇනිමේ විස්තර ලබා ගැනීමට නොහැකි විය. API දෝෂයක් විය හැක."));
        }

        const totalEp = parseInt(info.totalEpisodes || info.episodes?.length || 0);

        // 🛠️ FIX: Uses info.name as a fallback if info.title is missing
        let body = `🎬 *${safeStr(info.title || info.name)}*\n\n` +
                   `🌟 *Rating:* ${info.rating || 'N/A'}\n` +
                   `📺 *Total Episodes:* ${totalEp}\n\n` +
                   `*📂 EPISODE CATEGORIES*\n`;

        if (totalEp <= 1) {
            body += `මෙය චිත්‍රපටයක් හෝ තනි කොටසකි.\n📌 Download: *.e 1*`;
        } else {
            const chunks = Math.ceil(totalEp / 10);
            for (let i = 0; i < chunks; i++) {
                body += `[ *${i + 1}* ] Episodes ${(i * 10) + 1} - ${Math.min((i + 1) * 10, totalEp)}\n`;
            }
            body += `\n📌 *Category අංකය Reply කරන්න. (උදා: .c 1)*`;
        }
        body += `\n\n> 📌 ANID: ${animeId}`;

        await deleteMsg(hansaka, from, statusMsg.key);
        
        // 🛠️ FIX: Safe Image Fallback
        const animeImgUrl = info.image || 'https://i.ibb.co/s93hdn6L/Olya-welcome.png';
        
        await hansaka.sendMessage(from, { image: { url: animeImgUrl }, caption: formatMsg("✅ *Anime Info*", body) }, { quoted: mek });

    } catch (e) { reply(formatMsg("🔴 *Error*", e.message)); }
});

// =============================================
// 3. EPISODE LIST: .c <number>
// =============================================
cmd({ pattern: "c", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const catNum = parseInt(q);
        const rawText = m.quoted?.text || m.quoted?.caption || "";
        const animeId = rawText.match(/ANID:\s*([^\s]+)/)?.[1];
        if (!animeId) return;

        const statusMsg = await reply(formatMsg("📂 *Loading List...*", "ලැයිස්තුව සකසමින්..."));
        const info = await getEpisodes(animeId);
        const chunk = info.episodes.slice((catNum - 1) * 10, catNum * 10);

        let body = `📂 *EPISODE LIST (Group ${catNum})*\n\n`;
        chunk.forEach(ep => body += `[ *${ep.number}* ] Episode ${ep.number}\n`);
        body += `\n📌 *Episode අංකය Reply කරන්න. (උදා: .e ${chunk[0].number})*\n\n> 📌 ANID: ${animeId}`;

        await deleteMsg(hansaka, from, statusMsg.key);
        await reply(formatMsg("📜 *Episodes List*", body));
    } catch (e) { reply(e.message); }
});

// =============================================
// 4. QUALITY BUTTONS: .e <number>
// =============================================
cmd({ pattern: "e", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const epNum = parseInt(q);
        const rawText = m.quoted?.text || m.quoted?.caption || "";
        const animeId = rawText.match(/ANID:\s*([^\s]+)/)?.[1];
        if (!animeId) return;

        const statusMsg = await reply(formatMsg("🔗 *Fetching Links...*", `Episode ${epNum} ලින්ක් සොයමින්...`));
        const info = await getEpisodes(animeId);
        let epObj = info.episodes.find(e => parseInt(e.number) === epNum);
        if (!epObj && epNum === 1 && info.episodes.length > 0) epObj = info.episodes[0];

        const sources = await getStreamLink(epObj.id);
        
        if (!sources || sources.length === 0) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", "මෙම කොටස සඳහා ලින්ක් හමු නොවීය."));
        }

        let buttons = sources.filter(s => s.quality !== 'backup').slice(0, 3).map(s => ({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: `🎥 ${safeStr(s.quality)}`, id: `.d ${epObj.id}|${safeStr(s.quality)}|${epNum}` })
        }));

        await deleteMsg(hansaka, from, statusMsg.key);
        const img = getAnimeImg();
        await sendInteractiveMessage(hansaka, from, {
            text: `🎬 *Episode ${epNum}*\n\nQuality එක තෝරන්න:`,
            footer: FOOTER_TEXT,
            image: img ? { buffer: img } : { url: 'https://i.ibb.co/s93hdn6L/Olya-welcome.png' },
            interactiveButtons: buttons
        });
    } catch (e) { reply(e.message); }
});

// =============================================
// 5. DOWNLOADER: .d
// =============================================
cmd({ pattern: "d", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const [epId, qual, num] = q.split('|');
        let status = await reply(formatMsg("🔄 *Downloading...*", `Episode ${num} (${qual}) බාගත කරමින්...⏳`));
        const sources = await getStreamLink(epId);
        
        // 🛠️ FIX: Added safety check if stream URL is missing
        const stream = sources.find(s => s.quality === qual)?.url || sources[0]?.url;
        if (!stream) {
            await deleteMsg(hansaka, from, status.key);
            return reply(formatMsg("🔴 *Error*", "බාගත කිරීමේ ලින්ක් එක ලබා ගැනීමට නොහැකි විය."));
        }

        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
        const filePath = path.join(dataDir, `temp_${Date.now()}.mp4`);

        await convertToMP4(stream, filePath);
        await deleteMsg(hansaka, from, status.key);
        status = await reply(formatMsg("📤 *Uploading...*", `WhatsApp වෙත එවමින් පවතී... 🚀`));

        const fileSize = fs.statSync(filePath).size;
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);

        await hansaka.sendMessage(from, { 
            document: fs.readFileSync(filePath), 
            mimetype: 'video/mp4', 
            fileName: `Anime_Ep${num}.mp4`, 
            caption: formatMsg(`🎬 Episode ${num}`, `Quality: ${qual}\nSize: ${sizeMB} MB`) 
        }, { quoted: mek });

        await deleteMsg(hansaka, from, status.key);
        fs.unlinkSync(filePath);
    } catch (e) { reply(e.message); }
});

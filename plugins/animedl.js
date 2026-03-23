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
    try { if (key) await hansaka.sendMessage(from, { delete: key }); } catch (e) { console.log("Failed to delete msg:", e.message); }
};

// Config Image Buffer
const getAnimeImg = () => {
    try {
        if (config.ANIME_IMG && fs.existsSync(config.ANIME_IMG)) return fs.readFileSync(config.ANIME_IMG);
        return null;
    } catch (e) { return null; }
};

// Safe String Converter
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
            .on('error', (err) => reject(new Error(`FFmpeg Error: ${err.message}`)))
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
        
        if (!info || info.error) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Not Found*", "ඇනිමේ විස්තර ලබා ගැනීමට නොහැකි විය. API දෝෂයක් විය හැක."));
        }

        const totalEp = parseInt(info.totalEpisodes || info.episodes?.length || 0);

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
        if (isNaN(catNum)) return reply(formatMsg("🔴 *Error*", "කරුණාකර Category අංකය නිවැරදිව ලබා දෙන්න. (උදා: .c 1)"));

        const rawText = m.quoted?.text || m.quoted?.caption || m.quoted?.msg?.caption || m.quoted?.message?.imageMessage?.caption || "";
        const animeIdMatch = rawText.match(/ANID:\s*([^\s]+)/);
        const animeId = animeIdMatch ? animeIdMatch[1] : null;

        if (!animeId) {
            return reply(formatMsg("🔴 *Error*", "ANID එක සොයාගත නොහැක. කරුණාකර අදාළ Anime Info මැසේජ් එකටම Reply කරන්න."));
        }

        const statusMsg = await reply(formatMsg("📂 *Loading List...*", "ලැයිස්තුව සකසමින්..."));
        const info = await getEpisodes(animeId);
        
        if (!info || info.error || !info.episodes || info.episodes.length === 0) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", "මෙම කාණ්ඩය සඳහා කොටස් සොයාගත නොහැක."));
        }

        const chunk = info.episodes.slice((catNum - 1) * 10, catNum * 10);
        let body = `📂 *EPISODE LIST (Group ${catNum})*\n\n`;
        chunk.forEach(ep => body += `[ *${ep.number}* ] Episode ${ep.number}\n`);
        body += `\n📌 *Episode අංකය Reply කරන්න. (උදා: .e ${chunk[0].number})*\n\n> 📌 ANID: ${animeId}`;

        await deleteMsg(hansaka, from, statusMsg.key);
        await reply(formatMsg("📜 *Episodes List*", body));
    } catch (e) { reply(formatMsg("🔴 *System Error*", e.message)); }
});

// =============================================
// 4. QUALITY BUTTONS: .e <number>
// =============================================
cmd({ pattern: "e", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const epNum = parseInt(q);
        if (isNaN(epNum)) return reply(formatMsg("🔴 *Error*", "කරුණාකර Episode අංකය නිවැරදිව ලබා දෙන්න. (උදා: .e 1)"));

        const rawText = m.quoted?.text || m.quoted?.caption || m.quoted?.msg?.caption || m.quoted?.message?.imageMessage?.caption || "";
        const animeIdMatch = rawText.match(/ANID:\s*([^\s]+)/);
        const animeId = animeIdMatch ? animeIdMatch[1] : null;

        if (!animeId) {
            return reply(formatMsg("🔴 *Error*", "ANID එක සොයාගත නොහැක. කරුණාකර අදාළ Anime Info මැසේජ් එකටම Reply කරන්න."));
        }

        const statusMsg = await reply(formatMsg("🔗 *Fetching Links...*", `Episode ${epNum} ලින්ක් සොයමින්...`));
        const info = await getEpisodes(animeId);
        
        if (!info || info.error || !info.episodes || info.episodes.length === 0) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", "මෙම ඇනිමේ එකේ Episodes සොයාගත නොහැක."));
        }

        let epObj = info.episodes.find(e => parseInt(e.number) === epNum);
        if (!epObj && epNum === 1 && info.episodes.length > 0) epObj = info.episodes[0]; // Movie Fallback

        if (!epObj) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", `Episode ${epNum} සොයාගත නොහැක.`));
        }

        const sources = await getStreamLink(epObj.id);
        
        if (!sources || sources.length === 0) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", "මෙම කොටස සඳහා බාගත කිරීමේ ලින්ක් හමු නොවීය."));
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
    } catch (e) { reply(formatMsg("🔴 *System Error*", e.message)); }
});

// =============================================
// 5. DOWNLOADER: .d (OPTIMIZED)
// =============================================
cmd({ pattern: "d", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    let statusMsg1, statusMsg2;
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    const filePath = path.join(dataDir, `temp_${Date.now()}.mp4`);

    try {
        const [epId, qual, num] = q.split('|');
        statusMsg1 = await reply(formatMsg("🔄 *Downloading...*", `Episode ${num} (${qual}) බාගත කරමින්...⏳`));
        const sources = await getStreamLink(epId);
        
        const stream = sources.find(s => s.quality === qual)?.url || sources[0]?.url;
        if (!stream) {
            await deleteMsg(hansaka, from, statusMsg1.key);
            return reply(formatMsg("🔴 *Error*", "බාගත කිරීමේ ලින්ක් එක ලබා ගැනීමට නොහැකි විය."));
        }

        await convertToMP4(stream, filePath);
        await deleteMsg(hansaka, from, statusMsg1.key);
        
        statusMsg2 = await reply(formatMsg("📤 *Uploading...*", `WhatsApp වෙත එවමින් පවතී... 🚀`));

        const fileSize = fs.statSync(filePath).size;
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);

        // 🟢 FIX: Using { url: filePath } to prevent Memory Leaks!
        await hansaka.sendMessage(from, { 
            document: { url: filePath }, 
            mimetype: 'video/mp4', 
            fileName: `Anime_Ep${num}.mp4`, 
            caption: formatMsg(`🎬 Episode ${num}`, `Quality: ${qual}\nSize: ${sizeMB} MB`) 
        }, { quoted: mek });

        await deleteMsg(hansaka, from, statusMsg2.key);

    } catch (e) { 
        console.error(e);
        reply(formatMsg("🔴 *System Error*", e.message)); 
    } finally {
        // 🟢 FIX: Guaranteed File Cleanup to prevent Storage Leaks!
        if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (err) { console.error("Cleanup Error:", err); }
        }
    }
});

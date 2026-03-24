const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const config = require('../config');
const { sendInteractiveMessage } = require('gifted-btns');

// 🔥 අපේම Native Engine එක (No Blocks, No 451 Errors)
const { ANIME } = require('@consumet/extensions');
const gogoanime = new ANIME.Gogoanime();

// =============================================
// GLOBAL DESIGNS & FOOTERS
// =============================================
const FOOTER_TEXT = "✨ 𝓔𝓵𝓮𝓰𝓪𝓷𝓽 𝓢𝓮𝓷𝓹𝓪𝓲 𝓞𝓵𝔂𝓪 ✨";
const formatMsg = (title, body) =>
    `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n\n> ${FOOTER_TEXT}`;

const deleteMsg = async (hansaka, from, key) => {
    try { if (key) await hansaka.sendMessage(from, { delete: key }); } catch (e) {}
};

const safeStr = (val) => {
    if (val === null || val === undefined) return "N/A";
    let str = typeof val === 'object' ? (val.english || val.romaji || val.userPreferred || JSON.stringify(val)) : String(val);
    return str.replace(/[\n\t]+/g, ' ').trim();
};

// =============================================
// API FETCHERS (HYBRID: JIKAN + NATIVE GOGOANIME) 🔥
// =============================================

// 1. Jikan API (100% Stable Search)
async function searchAnimeList(query) {
    try {
        const { data } = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=5`, { timeout: 15000 });
        return data.data.map(a => ({
            id: a.title, // Jikan Title එක Gogo Search එකට යැවීමට ගනී
            title: a.title,
            image: a.images?.jpg?.large_image_url || 'https://i.ibb.co/s93hdn6L/Olya-welcome.png'
        }));
    } catch (e) {
        console.error("🔴 Jikan Search Error:", e.message);
        return [];
    }
}

// 2. Info & Episodes (Native Local Engine)
async function getAnimeInfoNative(animeTitle) {
    try {
        // Gogoanime සර්ච් එකට ගැලපෙන්න නමේ තියෙන විශේෂ අකුරු අයින් කිරීම
        const cleanTitle = animeTitle.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
        const searchRes = await gogoanime.search(cleanTitle);
        const bestMatch = searchRes.results?.[0];
        
        if (!bestMatch) return { error: true, message: "මෙම ඇනිමේ එක Gogoanime හි හමු නොවීය." };

        const info = await gogoanime.fetchAnimeInfo(bestMatch.id);
        return info || { error: true };
    } catch (e) {
        console.error("🔴 Native Info Error:", e.message);
        return { error: true, message: e.message };
    }
}

// 3. Episodes by ID (Native)
async function getEpisodesById(gogoId) {
    try {
        const info = await gogoanime.fetchAnimeInfo(gogoId);
        return info || { error: true };
    } catch (e) {
        return { error: true, message: e.message };
    }
}

// 4. Stream Links (Native)
async function getStreamLink(episodeId) {
    try {
        const res = await gogoanime.fetchEpisodeSources(episodeId);
        return res.sources || [];
    } catch (e) {
        console.error("🔴 Stream Error:", e.message);
        return [];
    }
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
cmd({ pattern: "anime", category: "downloader", filename: __filename },
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(formatMsg("🔴 *Error*", "Anime නම ලබා දෙන්න."));
        await hansaka.sendMessage(from, { react: { text: "🔍", key: mek.key } });
        const statusMsg = await reply(formatMsg("🔍 *Searching...*", `"${q}" සොයමින් පවතී... ⏳`));

        const results = await searchAnimeList(q);
        if (results.length === 0) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Not Found*", "සොයන නමට අදාළ කිසිවක් හමු නොවීය."));
        }

        let buttons = results.slice(0, 5).map(res => ({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: safeStr(res.title).substring(0, 20), id: `.ainfo ${res.id}` })
        }));

        await deleteMsg(hansaka, from, statusMsg.key);
        await sendInteractiveMessage(hansaka, from, {
            text: `🔍 *SEARCH RESULTS FOR:* ${q}`,
            footer: FOOTER_TEXT,
            image: { url: results[0].image },
            interactiveButtons: buttons
        });
    } catch (e) { reply(formatMsg("🔴 *Error*", e.message)); }
});

// =============================================
// 2. INFO: .ainfo <title>
// =============================================
cmd({ pattern: "ainfo", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const animeTitle = q.trim();
        const statusMsg = await reply(formatMsg("📋 *Loading Info...*", "ඇනිමේ විස්තර ලබාගනිමින් පවතී..."));

        const info = await getAnimeInfoNative(animeTitle);
        if (!info || info.error) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", "මෙම ඇනිමේ එක ඩවුන්ලෝඩ් කිරීමට නොමැත."));
        }

        const eps = info.episodes || [];
        let body = `🎬 *${safeStr(info.title)}*\n📅 *Release:* ${info.releaseDate || 'N/A'}\n📺 *Episodes:* ${eps.length}\n\n📌 *EPISODE LIST*\n`;

        eps.slice(0, 10).forEach(e => body += `[ *${e.number}* ] Ep ${e.number}\n`);
        body += `\n📌 *.ep <අංකය>* ලෙස Reply කරන්න.\n\n> 📌 ANID: ${info.id}`;

        await deleteMsg(hansaka, from, statusMsg.key);
        await hansaka.sendMessage(from, { image: { url: info.image }, caption: formatMsg("✅ *Anime Info*", body) }, { quoted: mek });
    } catch (e) { reply(formatMsg("🔴 *Error*", e.message)); }
});

// =============================================
// 3. EPISODE LIST: .c <number>
// =============================================
cmd({ pattern: "c", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const catNum = parseInt(q);
        if (isNaN(catNum)) return reply(formatMsg("🔴 *Error*", "Category අංකය ලබා දෙන්න."));

        const rawText = m.quoted?.text || m.quoted?.caption || m.quoted?.msg?.caption || "";
        const animeId = rawText.match(/ANID:\s*([^\s]+)/)?.[1];
        if (!animeId) return reply(formatMsg("🔴 *Error*", "Anime Info එකට Reply කරන්න."));

        const statusMsg = await reply(formatMsg("📂 *Loading List...*", "ලැයිස්තුව සකසමින්..."));
        const info = await getEpisodesById(animeId);

        const eps = info.episodes || [];
        if (eps.length === 0) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", "කොටස් සොයාගත නොහැක."));
        }

        const chunk = eps.slice((catNum - 1) * 10, catNum * 10);
        let body = `📂 *EPISODE LIST (Group ${catNum})*\n\n`;
        chunk.forEach(ep => body += `[ *${ep.number}* ] Episode ${ep.number}\n`);
        body += `\n📌 *Episode අංකය Reply කරන්න.*\n\n> 📌 ANID: ${animeId}`;

        await deleteMsg(hansaka, from, statusMsg.key);
        await reply(formatMsg("📜 *Episodes*", body));
    } catch (e) { reply(formatMsg("🔴 *Error*", e.message)); }
});

// =============================================
// 4. QUALITY: .ep <number>
// =============================================
cmd({ pattern: "ep", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const epNum = q.trim();
        const rawText = m.quoted?.text || m.quoted?.caption || m.quoted?.msg?.caption || "";
        const animeId = rawText.match(/ANID:\s*([^\s]+)/)?.[1];

        if (!animeId) return reply(formatMsg("🔴 *Error*", "Anime Info එකට Reply කරන්න."));

        const statusMsg = await reply(formatMsg("🔗 *Fetching Links...*", `Episode ${epNum} ලින්ක් සොයමින්...`));
        const info = await getEpisodesById(animeId);

        const epObj = info.episodes?.find(e => e.number == epNum);
        if (!epObj) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", "Episode එක හමු නොවීය."));
        }

        const sources = await getStreamLink(epObj.id);
        if (!sources || sources.length === 0) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", "බාගත කිරීමේ ලින්ක් හමු නොවීය."));
        }

        let buttons = sources.slice(0, 3).map(s => ({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text: `🎥 ${s.quality}`,
                id: `.dl ${epObj.id}|${s.quality}|${epNum}`
            })
        }));

        await deleteMsg(hansaka, from, statusMsg.key);
        await sendInteractiveMessage(hansaka, from, { text: `🎬 Ep ${epNum} Quality එක තෝරන්න:`, footer: FOOTER_TEXT, interactiveButtons: buttons });
    } catch (e) { reply(formatMsg("🔴 *Error*", e.message)); }
});

// =============================================
// 5. DOWNLOAD: .dl
// =============================================
cmd({ pattern: "dl", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    const [watchId, qual, num] = q.split('|');
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    const filePath = path.join(dataDir, `temp_${Date.now()}.mp4`);

    let statusMsg1;
    try {
        statusMsg1 = await reply(formatMsg("🔄 *Downloading...*", `Episode ${num} (${qual}) බාගත කරමින්...⏳`));

        const sources = await getStreamLink(watchId);
        const url = sources.find(s => s.quality === qual)?.url || sources[0]?.url;

        if (!url) {
            await deleteMsg(hansaka, from, statusMsg1.key);
            return reply(formatMsg("🔴 *Error*", "වීඩියෝ ලින්ක් එක ලබා ගැනීමට නොහැකි විය."));
        }

        await convertToMP4(url, filePath);
        await deleteMsg(hansaka, from, statusMsg1.key);

        const statusMsg2 = await reply(formatMsg("📤 *Uploading...*", `WhatsApp වෙත එවමින් පවතී... 🚀`));
        await hansaka.sendMessage(from, { document: { url: filePath }, mimetype: 'video/mp4', fileName: `Anime_Ep${num}.mp4`, caption: `🎬 Episode ${num}\n🎥 Quality: ${qual}` }, { quoted: mek });
        await deleteMsg(hansaka, from, statusMsg2.key);

    } catch (e) {
        console.error(e);
        reply(formatMsg("🔴 *System Error*", e.message));
    } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
});

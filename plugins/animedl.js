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
const FOOTER_TEXT = "✨ 𝓔𝓵𝓮𝓰𝓪𝓷𝓽 𝓢𝓮𝓷𝓹𝓪𝓲 𝓞𝓵𝔂𝓪 ✨";
const formatMsg = (title, body) =>
    `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n\n> ${FOOTER_TEXT}`;

const deleteMsg = async (hansaka, from, key) => {
    try { if (key) await hansaka.sendMessage(from, { delete: key }); } catch (e) {}
};

const safeStr = (val) => {
    if (val === null || val === undefined) return "N/A";
    let str = typeof val === 'object' ? (val.english || val.romaji || val.native || val.userPreferred || JSON.stringify(val)) : String(val);
    return str.replace(/[\n\t]+/g, ' ').trim(); 
};

// =============================================
// API FETCHERS (ANIFY API ENGINE) 🔥
// =============================================
const BASE_URL = "https://api.anify.tv";

// 1. Search Anime (Anify)
async function searchAnimeList(query) {
    try {
        const { data } = await axios.get(`${BASE_URL}/search?query=${encodeURIComponent(query)}&type=anime`, { timeout: 15000 });
        return data.slice(0, 5).map(a => ({
            id: a.id,
            title: a.title.english || a.title.romaji || a.title.native,
            image: a.coverImage || a.bannerImage || 'https://i.ibb.co/s93hdn6L/Olya-welcome.png'
        }));
    } catch (e) {
        console.error("🔴 Anify Search Error:", e.message);
        return [];
    }
}

// 2. Get Info & Episodes (Anify)
async function getAnimeInfoAndEpisodes(animeId) {
    try {
        // ඇනිමේ එකේ විස්තර සහ පින්තූර ලබා ගැනීම
        const infoRes = await axios.get(`${BASE_URL}/info/${animeId}`, { timeout: 15000 });
        const info = infoRes.data;
        
        // එපිසෝඩ් ලබා දෙන Providers ලා ලබා ගැනීම
        const epRes = await axios.get(`${BASE_URL}/episodes/${animeId}`, { timeout: 15000 });
        const providers = epRes.data;
        
        // හොඳම Provider තෝරා ගැනීම (Gogoanime -> Zoro -> Any)
        const provider = providers.find(p => p.providerId === 'gogoanime') || providers.find(p => p.providerId === 'zoro') || providers[0];
        
        if (!provider) return { error: true, message: "Episodes not found" };

        return {
            id: animeId,
            title: info.title?.english || info.title?.romaji || info.title?.native || "Anime",
            image: info.coverImage || info.bannerImage,
            providerId: provider.providerId,
            episodes: provider.episodes // [{ id: "watchId", number: 1 }]
        };
    } catch (e) {
        console.error("🔴 Anify Info Error:", e.message);
        return { error: true, message: e.message };
    }
}

// 3. Get Direct Video Stream (Anify)
async function getStreamLink(animeId, providerId, watchId, epNum) {
    try {
        const url = `${BASE_URL}/sources?providerId=${providerId}&watchId=${encodeURIComponent(watchId)}&episodeNumber=${epNum}&id=${animeId}&subType=sub`;
        const { data } = await axios.get(url, { timeout: 15000 });
        return data.sources || [];
    } catch (e) {
        console.error("🔴 Anify Stream Error:", e.message);
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
            text: `🔍 *SEARCH RESULTS FOR:* ${q}\n\nපහත ලැයිස්තුවෙන් නිවැරදි ඇනිමේ එක තෝරන්න:`,
            footer: FOOTER_TEXT,
            image: { url: results[0].image },
            interactiveButtons: buttons
        });
    } catch (e) { reply(formatMsg("🔴 *Error*", e.message)); }
});

// =============================================
// 2. INFO: .ainfo <id>
// =============================================
cmd({ pattern: "ainfo", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const animeId = q.trim();
        const statusMsg = await reply(formatMsg("📋 *Loading Info...*", "ඇනිමේ විස්තර ලබාගනිමින් පවතී..."));

        const info = await getAnimeInfoAndEpisodes(animeId);
        if (!info || info.error) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", "විස්තර ලබාගත නොහැක."));
        }

        const eps = info.episodes || [];
        let body = `🎬 *${safeStr(info.title)}*\n🔌 *Provider:* ${info.providerId}\n📺 *Episodes:* ${eps.length}\n\n📌 *EPISODE LIST*\n`;
        
        // මුල් එපිසෝඩ් 10 පමණක් පෙන්වයි (නැත්නම් මැසේජ් එක දිග වැඩි වේ)
        eps.slice(0, 10).forEach(e => body += `[ *${e.number}* ] Ep ${e.number}\n`);
        body += `\n📌 *.ep <අංකය>* ලෙස Reply කරන්න.\n\n> 📌 ANID: ${animeId} | PROV: ${info.providerId}`;

        await deleteMsg(hansaka, from, statusMsg.key);
        await hansaka.sendMessage(from, { image: { url: info.image }, caption: formatMsg("✅ *Anime Info*", body) }, { quoted: mek });
    } catch (e) { reply(formatMsg("🔴 *Error*", e.message)); }
});

// =============================================
// 4. QUALITY: .ep <number>
// =============================================
cmd({ pattern: "ep", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const rawText = m.quoted?.text || m.quoted?.caption || m.quoted?.msg?.caption || "";
        const animeIdMatch = rawText.match(/ANID:\s*([^\s|]+)/);
        const providerMatch = rawText.match(/PROV:\s*([^\s]+)/);
        
        const animeId = animeIdMatch ? animeIdMatch[1].trim() : null;
        const providerId = providerMatch ? providerMatch[1].trim() : null;

        if (!animeId || !providerId) return reply(formatMsg("🔴 *Error*", "Anime Info එකට Reply කරන්න."));

        const statusMsg = await reply(formatMsg("🔗 *Fetching Links...*", `Episode ${q} ලින්ක් සොයමින්...`));
        const info = await getAnimeInfoAndEpisodes(animeId);
        
        const epObj = info.episodes?.find(e => e.number == q);
        if (!epObj) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", "Episode එක හමු නොවීය."));
        }

        const sources = await getStreamLink(animeId, providerId, epObj.id, q);
        if (!sources || sources.length === 0) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", "බාගත කිරීමේ ලින්ක් හමු නොවීය."));
        }

        let buttons = sources.slice(0, 3).map(s => ({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ 
                display_text: `🎥 ${s.quality}`, 
                id: `.dl ${animeId}|${providerId}|${epObj.id}|${s.quality}|${q}` 
            })
        }));

        await deleteMsg(hansaka, from, statusMsg.key);
        await sendInteractiveMessage(hansaka, from, { text: `🎬 Ep ${q} Quality එක තෝරන්න:`, footer: FOOTER_TEXT, interactiveButtons: buttons });
    } catch (e) { reply(formatMsg("🔴 *Error*", e.message)); }
});

// =============================================
// 5. DOWNLOAD: .dl
// =============================================
cmd({ pattern: "dl", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    const [animeId, providerId, watchId, qual, num] = q.split('|');
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    const filePath = path.join(dataDir, `temp_${Date.now()}.mp4`);

    let statusMsg1;
    try {
        statusMsg1 = await reply(formatMsg("🔄 *Downloading...*", `Episode ${num} (${qual}) බාගත කරමින්...⏳`));
        
        const sources = await getStreamLink(animeId, providerId, watchId, num);
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

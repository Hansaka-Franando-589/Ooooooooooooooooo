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
    let str = typeof val === 'object' ? (val.english || val.romaji || val.userPreferred || JSON.stringify(val)) : String(val);
    return str.replace(/[\n\t]+/g, ' ').trim(); 
};

// =============================================
// API FETCHERS (STABLE MIRROR ENGINE) 🔥
// =============================================
// Railway IP Block නොවන අලුත්ම Mirror එකක්
const BASE_URL = "https://consumet-api-clone.vercel.app/anime/gogoanime";

async function searchAnimeList(query) {
    try {
        const url = `${BASE_URL}/${encodeURIComponent(query)}`;
        const res = await axios.get(url, { timeout: 15000 });
        return res.data.results || [];
    } catch (e) { return []; }
}

async function getEpisodes(animeId) {
    try {
        const url = `${BASE_URL}/info/${encodeURIComponent(animeId)}`;
        const res = await axios.get(url, { timeout: 15000 });
        return res.data || {};
    } catch (e) { return { error: true }; }
}

async function getStreamLink(episodeId) {
    try {
        const url = `${BASE_URL}/watch/${encodeURIComponent(episodeId)}`;
        const res = await axios.get(url, { timeout: 15000 });
        return res.data.sources || [];
    } catch (e) { return []; }
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
        const statusMsg = await reply(formatMsg("🔍 *Searching...*", `"${q}" සොයමින්...`));
        const results = await searchAnimeList(q);
        if (results.length === 0) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Not Found*", "කිසිවක් හමු නොවීය."));
        }
        let buttons = results.slice(0, 5).map(res => ({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: safeStr(res.title).substring(0, 20), id: `.ainfo ${res.id}` })
        }));
        await deleteMsg(hansaka, from, statusMsg.key);
        await sendInteractiveMessage(hansaka, from, {
            text: `🔍 *RESULTS:* ${q}`,
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
        const info = await getEpisodes(q.trim());
        if (!info || info.error) return reply(formatMsg("🔴 *Error*", "විස්තර ලබාගත නොහැක."));
        const eps = info.episodes || [];
        let body = `🎬 *${safeStr(info.title)}*\n📺 *Episodes:* ${eps.length}\n\n📌 *EPISODE LIST*\n`;
        eps.slice(0, 10).forEach(e => body += `[ *${e.number}* ] Ep ${e.number}\n`);
        body += `\n📌 *.ep <අංකය>* ලෙස reply කරන්න.\n\n> 📌 ANID: ${q.trim()}`;
        await hansaka.sendMessage(from, { image: { url: info.image }, caption: formatMsg("✅ *Info*", body) }, { quoted: mek });
    } catch (e) { reply(formatMsg("🔴 *Error*", e.message)); }
});

// =============================================
// 4. QUALITY: .ep <number>
// =============================================
cmd({ pattern: "ep", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const rawText = m.quoted?.text || m.quoted?.caption || m.quoted?.msg?.caption || "";
        const animeId = rawText.match(/ANID:\s*([^\s]+)/)?.[1];
        if (!animeId) return reply(formatMsg("🔴 *Error*", "Anime Info එකට reply කරන්න."));
        const info = await getEpisodes(animeId);
        const epObj = info.episodes?.find(e => e.number == q);
        if (!epObj) return reply(formatMsg("🔴 *Error*", "Episode එක හමු නොවීය."));
        const sources = await getStreamLink(epObj.id);
        let buttons = sources.slice(0, 3).map(s => ({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: `🎥 ${s.quality}`, id: `.dl ${epObj.id}|${s.quality}|${q}` })
        }));
        await sendInteractiveMessage(hansaka, from, { text: `🎬 Ep ${q}`, footer: FOOTER_TEXT, interactiveButtons: buttons });
    } catch (e) { reply(formatMsg("🔴 *Error*", e.message)); }
});

// =============================================
// 5. DOWNLOAD: .dl
// =============================================
cmd({ pattern: "dl", filename: __filename }, async (hansaka, mek, m, { from, q, reply }) => {
    const [id, qual, num] = q.split('|');
    const filePath = path.join(__dirname, `../data/temp_${Date.now()}.mp4`);
    try {
        const sources = await getStreamLink(id);
        const url = sources.find(s => s.quality === qual)?.url || sources[0].url;
        await convertToMP4(url, filePath);
        await hansaka.sendMessage(from, { document: { url: filePath }, mimetype: 'video/mp4', fileName: `Ep_${num}.mp4`, caption: `🎬 Ep ${num} (${qual})` }, { quoted: mek });
    } catch (e) { reply(formatMsg("🔴 *Error*", e.message)); }
    finally { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
});

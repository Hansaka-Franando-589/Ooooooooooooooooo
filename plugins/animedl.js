const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const config = require('../config');
const cheerio = require('cheerio');

// =============================================
// GLOBAL DESIGNS & FOOTERS
// =============================================
const FOOTER_TEXT = "𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝";
const formatMsg = (title, body) =>
    `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n\n> ${FOOTER_TEXT}`;

const deleteMsg = async (hansaka, from, key) => {
    try { if (key) await hansaka.sendMessage(from, { delete: key }); } catch (e) {}
};

// =============================================
// TELEGRAM SCRAPER LOGIC (Fallback)
// =============================================
const searchTelegram = async (query) => {
    try {
        const url = `https://t.me/s/animehub6`; // ඔයාගේ චැනල් එක
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let results = [];

        $('.tgme_widget_message_wrap').each((i, el) => {
            const text = $(el).find('.tgme_widget_message_text').text();
            const link = $(el).find('.tgme_widget_message_date').attr('href');
            if (text && text.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                    id: link, 
                    title: text.split('\n')[0].trim(),
                    isTelegram: true
                });
            }
        });
        return results.reverse().slice(0, 5);
    } catch (e) { return []; }
};

// =============================================
// VIDEO PROCESSING (m3u8 to mp4)
// =============================================
const convertToMP4 = (url, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(url)
            .outputOptions(['-c copy', '-bsf:a aac_adtstoasc'])
            .output(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err))
            .run();
    });
};

// =============================================
// API FETCHERS (Cloudflare Bypass Included)
// =============================================
async function searchAnimeList(query) {
    try {
        const res = await axios.get(`https://api.anispace.workers.dev/search/${encodeURIComponent(query)}`, { timeout: 10000 });
        return res.data.results || [];
    } catch (e) {
        return await searchTelegram(query); // API වැඩ නැත්නම් Telegram බලනවා
    }
}

async function getEpisodes(animeId) {
    try {
        const res = await axios.get(`https://api.anispace.workers.dev/anime/${animeId}`);
        return res.data;
    } catch (e) { return null; }
}

async function getStreamLink(episodeId) {
    try {
        const res = await axios.get(`https://api.anispace.workers.dev/episode/${episodeId}`);
        return res.data.sources || res.data;
    } catch (e) { return null; }
}

// =============================================
// COMMANDS
// =============================================

// 1. Search Anime
cmd({
    pattern: "anime",
    category: "anime",
    desc: "Search anime from API or Telegram.",
    use: ".anime Naruto",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❗ කරුණාකර නමක් දෙන්න.");
        let status = await reply("🔍 සොයමින් පවතී...");
        
        const results = await searchAnimeList(q);
        await deleteMsg(hansaka, from, status.key);

        if (!results || results.length === 0) return reply("🚫 ප්‍රතිඵල හමු නොවීය.");

        let msg = `🎬 *Anime Search Results*\n\n`;
        results.forEach((res, i) => {
            if (res.isTelegram) {
                msg += `*${i + 1}.* ${res.title}\n🔗 [Telegram Link](${res.id})\n\n`;
            } else {
                msg += `*${i + 1}.* ${res.title}\n🆔 ID: \`${res.id}\`\n\n`;
            }
        });
        
        msg += `> එපිසෝඩ් ගැනීමට \`.anisero [ID]\` ලබා දෙන්න.`;
        reply(formatMsg("✨ Results", msg));
    } catch (e) { reply("🔴 දෝෂයක් සිදු විය."); }
});

// 2. Get Episodes
cmd({
    pattern: "anisero",
    category: "anime",
    desc: "Get episodes list.",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❗ ID එකක් දෙන්න.");
        const data = await getEpisodes(q);
        if (!data) return reply("🔴 දත්ත සොයාගත නොහැකි විය.");

        let msg = `🎬 *${data.title}*\n\n`;
        data.episodes.slice(0, 15).forEach(ep => {
            msg += `🔹 Ep ${ep.number}: \`.anidl ${ep.id}|720p|${ep.number}\` \n`;
        });
        reply(formatMsg("📺 Episode List", msg));
    } catch (e) { reply("🔴 දෝෂයක් විය."); }
});

// 3. Download & Send
cmd({
    pattern: "anidl",
    category: "anime",
    desc: "Download and send anime.",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        const [epId, qual, num] = q.split('|');
        if (!epId) return reply("❗ වැරදි විධානයක්.");

        let status = await reply("🔄 Episode " + num + " සකස් කරමින්... ⏳");
        const sources = await getStreamLink(epId);
        const stream = (Array.isArray(sources) ? sources[0]?.url : sources);

        if (!stream) return reply("🔴 ලින්ක් එක සොයාගත නොහැකි විය.");

        const filePath = path.join(__dirname, `../data/anime_${Date.now()}.mp4`);
        if (!fs.existsSync(path.join(__dirname, '../data'))) fs.mkdirSync(path.join(__dirname, '../data'));

        await convertToMP4(stream, filePath);
        await deleteMsg(hansaka, from, status.key);

        await hansaka.sendMessage(from, { 
            document: fs.readFileSync(filePath), 
            mimetype: 'video/mp4', 
            fileName: `Anime_Ep_${num}.mp4`, 
            caption: formatMsg("✅ සාර්ථකයි", `Episode: ${num}\nQuality: ${qual}`)
        }, { quoted: mek });

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) { 
        console.log(e);
        reply("🔴 වීඩියෝව එවීමේදී දෝෂයක් විය."); 
    }
});

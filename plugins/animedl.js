const { cmd } = require('../command');
const consumet = require('@consumet/extensions');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const formatMsg = (title, body) =>
    `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`;

// =============================================
// DYNAMIC PROVIDER FINDER 🔥
// =============================================
// Consumet Package එකේ නම් වෙනස් වුණත්, ඇතුළේ තියෙන වැඩ කරන අයව ස්වයංක්‍රීයව හොයාගැනීම.
const PROVIDERS = {};
const animeModule = consumet.ANIME || consumet.PROVIDERS?.ANIME || {}; 
const excluded = ['animepahe', 'zoro', 'enime']; // වැඩ කරන්නේ නැති අඩවි

Object.keys(animeModule).forEach(key => {
    if (typeof animeModule[key] === 'function' && !excluded.includes(key.toLowerCase())) {
        PROVIDERS[key.toLowerCase()] = () => new animeModule[key]();
        console.log(`[Olya Assistant] ✅ Loaded Anime Provider: ${key}`);
    }
});

const http = axios.create({
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
});

// =============================================
// HELPER: Search
// =============================================
async function searchWithFallback(query) {
    const providerNames = Object.keys(PROVIDERS);
    if (providerNames.length === 0) {
        throw new Error('Consumet package එකේ කිසිදු Anime Provider කෙනෙක් සොයාගත නොහැක! Package එකේ දෝෂයකි. ⚠️');
    }

    let lastErr = null;
    for (const name of providerNames) {
        try {
            console.log(`[Search] Trying ${name}...`);
            const provider = PROVIDERS[name]();
            const res = await provider.search(query);
            if (res?.results?.length > 0) {
                return { results: res.results, providerName: name, provider };
            }
        } catch (e) {
            console.error(`[${name}] search error:`, e.message);
            lastErr = e;
        }
    }
    throw lastErr || new Error('Anime එක කිසිදු අඩවියකින් සොයා ගැනීමට නොහැකි විය.');
}

// =============================================
// HELPER: Fetch anime info
// =============================================
async function fetchInfoWithFallback(animeId, providerName) {
    const names = providerName ? [providerName] : Object.keys(PROVIDERS);
    let lastErr = null;
    for (const name of names) {
        try {
            if (!PROVIDERS[name]) continue;
            const provider = PROVIDERS[name]();
            const info = await provider.fetchAnimeInfo(animeId);
            if (info?.episodes?.length > 0) return { info, providerName: name, provider };
        } catch (e) {
            console.error(`[${name}] fetchInfo error:`, e.message);
            lastErr = e;
        }
    }
    throw lastErr || new Error('Anime info ලබාගත නොහැක.');
}

// =============================================
// HELPER: Fetch episode sources & Best quality
// =============================================
async function fetchSources(provider, episodeId) {
    const data = await provider.fetchEpisodeSources(episodeId);
    return data?.sources || [];
}

function selectBestSource(sources) {
    if (!sources?.length) return null;
    const priority = ['1080p', '720p', '480p', '360p', 'default', 'backup'];
    for (const q of priority) {
        const found = sources.find(s => s.quality === q);
        if (found?.url) return found;
    }
    return sources.find(s => s.url) || null;
}

// =============================================
// HELPER: FFmpeg M3U8/MP4 → local MP4
// =============================================
function convertToMP4(streamUrl, outputPath, referer) {
    return new Promise((resolve, reject) => {
        ffmpeg(streamUrl)
            .inputOptions([
                '-headers',
                `Referer: ${referer}\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n`,
                '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
            ])
            .outputOptions([
                '-c copy',
                '-bsf:a aac_adtstoasc',
                '-movflags +faststart',
            ])
            .output(outputPath)
            .on('end', () => resolve(true))
            .on('error', (err) => reject(err))
            .run();
    });
}

// =============================================
// 1. SEARCH COMMAND: .animevid <anime name>
// =============================================
cmd({
    pattern: "animevid",
    desc: "Search Anime and get Episode download info",
    category: "downloader",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(formatMsg("🔴 *Input Error*", "🤖 Anime නම ලිවීමේ ආකාරය:\n*.animevid Naruto*"));

        await hansaka.sendMessage(from, { react: { text: "🔍", key: mek.key } });
        await reply(formatMsg("🔍 *Searching...*", `"${q}" සොයමින් පවතී...⏳`));

        let searchResult;
        try {
            searchResult = await searchWithFallback(q);
        } catch (e) {
            return reply(formatMsg("🔴 *Server Error*", `${e.message}`));
        }

        const anime = searchResult.results[0];
        const providerName = searchResult.providerName;

        let totalEp = "?";
        try {
            const { info } = await fetchInfoWithFallback(anime.id, providerName);
            totalEp = info?.totalEpisodes || info?.episodes?.length || "?";
        } catch (_) {}

        const body =
            `🎬 *${anime.title}*\n\n` +
            `📺 *Total Episodes:* ${totalEp}\n` +
            `🌐 *Provider:* ${providerName}\n\n` +
            `👇 Download කිරීමට, *මේ message* reply කරලා:\n` +
            `*.ep 1* → Episode 1\n\n` +
            `> 📌 *ANID:* ${anime.id}|${providerName}`;

        try {
            await hansaka.sendMessage(from, {
                image: { url: anime.image },
                caption: formatMsg("✅ *Anime Found!*", body)
            }, { quoted: mek });
        } catch (_) {
            await reply(formatMsg("✅ *Anime Found!*", body));
        }
        await hansaka.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        reply(formatMsg("🔴 *Error*", e.message));
    }
});

// =============================================
// =============================================
// 2. DOWNLOAD COMMAND: .ep <number> (WITH X-RAY TRACKERS 🔍)
// =============================================
cmd({
    pattern: "ep",
    desc: "Download Anime Episode",
    category: "downloader",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        console.log("--> [TRACKER] 1. EP Command එක පටන් ගත්තා!");
        
        if (!q) return reply(formatMsg("🔴 *Input Error*", "Episode number එක දෙන්න."));
        const epNumber = parseInt(q.trim());
        console.log(`--> [TRACKER] 2. ඉල්ලපු Episode එක: ${epNumber}`);

        if (!m.quoted) return reply(formatMsg("🔴 *Action Required*", "*.animevid* result message reply කරන්න."));

        let rawText = m.quoted.text || m.quoted.caption || "";
        if (!rawText) {
            try {
                rawText = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption || "";
            } catch (_) {}
        }
        rawText = String(rawText);

        const anidMatch = rawText.match(/ANID:\s*([^\s|]+)\|([a-zA-Z0-9_]+)/i);
        if (!anidMatch) return reply(formatMsg("🔴 *ID Error*", "Anime ID හොයාගන්න බැරිවුණා."));

        const animeId = anidMatch[1].trim();
        const providerName = anidMatch[2].toLowerCase();
        console.log(`--> [TRACKER] 3. Anime ID: ${animeId} | Provider: ${providerName}`);

        console.log("--> [TRACKER] 4. Reaction එක යවනවා...");
        await hansaka.sendMessage(from, { react: { text: "📥", key: mek.key } });

        console.log("--> [TRACKER] 5. 'Loading' Text Reply එක යවනවා...");
        await reply(formatMsg("📋 *Loading Episode*", `Episode ${epNumber} ලොඩ් කරමින්...`));

        console.log("--> [TRACKER] 6. Consumet හරහා Anime Info ගන්න හදනවා (මෙතන හිරවෙන්න පුළුවන්!)...");
        let animeInfo, provider;
        try {
            const result = await fetchInfoWithFallback(animeId, providerName);
            animeInfo = result.info;
            provider = result.provider;
            console.log("--> [TRACKER] 7. Anime Info සාර්ථකව ගත්තා!");
        } catch (e) {
            console.log(`--> [TRACKER] 🔴 ERROR: Anime Info ගන්න බැරි වුණා: ${e.message}`);
            return reply(formatMsg("🔴 *Network Error*", e.message));
        }

        const epObj = animeInfo.episodes.find(e => e.number === epNumber);
        if (!epObj) {
            console.log(`--> [TRACKER] 🔴 ERROR: Episode ${epNumber} හොයාගන්න නෑ.`);
            return reply(formatMsg("🔴 *Not Found*", `Episode ${epNumber} නිකුත් නොවීය.`));
        }

        console.log("--> [TRACKER] 8. Stream Links ගන්න හදනවා...");
        let sources;
        try {
            sources = await fetchSources(provider, epObj.id);
            console.log("--> [TRACKER] 9. Stream Links සාර්ථකව ගත්තා!");
        } catch (e) {
            console.log(`--> [TRACKER] 🔴 ERROR: Stream links ගන්න බැරි වුණා: ${e.message}`);
            return reply(formatMsg("🔴 *Stream Error*", e.message));
        }

        const best = selectBestSource(sources);
        if (!best?.url) return reply(formatMsg("🔴 *Error*", "නිවැරදි stream URL නෑ."));

        console.log(`--> [TRACKER] 10. යවන්න ලෑස්තියි! Quality: ${best.quality || "HD"}`);
        await reply(formatMsg("🔄 *Downloading*", `Video convert කරමින් පවතී... ⏳`));
        
        // ... (අනෙකුත් convert සහ upload කොටස් සාමාන්‍ය පරිදි ක්‍රියාත්මක වේ)

    } catch (e) {
        console.error("--> [TRACKER] 🔴 CRITICAL ERROR වුණා: ", e);
        reply(formatMsg("🔴 *Error*", e.message));
    }
});

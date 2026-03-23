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
// 2. DOWNLOAD COMMAND: .ep <number> (BULLETPROOF & TIMEOUT SAFE 🛡️)
// =============================================
cmd({
    pattern: "ep",
    desc: "Download Anime Episode",
    category: "downloader",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        console.log("--> [TRACKER] 1. EP Command පටන් ගත්තා!");
        if (!q) return reply(formatMsg("🔴 *Input Error*", "Episode number එක දෙන්න."));
        const epNumber = parseInt(q.trim());

        // ඕනෑම ආකාරයක Quoted Text එකක් ආරක්ෂිතව කියවීම
        let rawText = "";
        try {
            const quotedMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            rawText = m.quoted?.text || m.quoted?.caption || quotedMsg?.imageMessage?.caption || quotedMsg?.extendedTextMessage?.text || "";
        } catch (e) {}
        
        rawText = String(rawText);

        if (!rawText.includes("ANID:")) {
            return reply(formatMsg("🔴 *Action Required*", "*.animevid* result මැසේජ් එක අනිවාර්යයෙන්ම *Reply* කරලා .ep කමාන්ඩ් එක ගහන්න."));
        }

        const anidMatch = rawText.match(/ANID:\s*([^\s|]+)\|([a-zA-Z0-9_]+)/i);
        if (!anidMatch) return reply(formatMsg("🔴 *ID Error*", "Anime ID එක කියවාගත නොහැක."));

        const animeId = anidMatch[1].trim();
        const providerName = anidMatch[2].toLowerCase();
        console.log(`--> [TRACKER] 3. Anime ID: ${animeId} | Provider: ${providerName}`);

        // Error ආවත් කෝඩ් එක හිර නොවන ආකාරයට Reply කිරීම (Non-blocking)
        console.log("--> [TRACKER] 4. Reaction යවනවා...");
        hansaka.sendMessage(from, { react: { text: "📥", key: mek.key } }).catch(() => console.log("React failed, skipping..."));

        console.log("--> [TRACKER] 5. Loading Text...");
        reply(formatMsg("📋 *Loading Episode*", `Episode ${epNumber} ලොඩ් කරමින්...`)).catch(() => console.log("Reply failed, skipping..."));

        // තත්පර 15ක කාල සීමාවක් (Timeout) සහිතව Fetch කිරීම
        const withTimeout = (promise, ms) => {
            let timer;
            const timeout = new Promise((_, reject) => timer = setTimeout(() => reject(new Error("Server Timeout")), ms));
            return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
        };

        console.log("--> [TRACKER] 6. Fetching info (with 15s timeout)...");
        let animeInfo, provider;
        try {
            const result = await withTimeout(fetchInfoWithFallback(animeId, providerName), 15000);
            animeInfo = result.info;
            provider = result.provider;
        } catch (e) {
            console.log("--> [TRACKER] 🔴 ERROR in fetchInfo:", e.message);
            return reply(formatMsg("🔴 *Server Error*", `Anime server එකෙන් response එකක් නැත. විනාඩියකින් නැවත උත්සාහ කරන්න.`));
        }

        const epObj = animeInfo.episodes.find(e => e.number === epNumber);
        if (!epObj) return reply(formatMsg("🔴 *Not Found*", `Episode ${epNumber} නිකුත් නොවීය.`));

        console.log("--> [TRACKER] 7. Fetching streams...");
        let sources;
        try {
            sources = await withTimeout(fetchSources(provider, epObj.id), 15000);
        } catch (e) {
            return reply(formatMsg("🔴 *Stream Error*", e.message));
        }

        const best = selectBestSource(sources);
        if (!best?.url) return reply(formatMsg("🔴 *Error*", "නිවැරදි stream URL නෑ."));

        console.log(`--> [TRACKER] 8. Downloading Quality: ${best.quality || "HD"}`);
        reply(formatMsg("🔄 *Downloading*", `🎬 Quality: ${best.quality || "HD"}\nVideo convert කරමින් පවතී... ⏳`)).catch(() => {});

        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        const safeId = animeId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
        const fileName = `ep_${safeId}_${epNumber}_${Date.now()}.mp4`;
        const filePath = path.join(dataDir, fileName);

        try {
            await convertToMP4(best.url, filePath, 'https://gogoanime3.co/');
        } catch (ffErr) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return reply(formatMsg("🔴 *Convert Error*", ffErr.message));
        }

        const fileSize = fs.statSync(filePath).size;
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);

        if (fileSize > 99 * 1024 * 1024) {
            fs.unlinkSync(filePath);
            return reply(formatMsg("🔴 *Too Large*", `File size ${sizeMB}MB - WhatsApp 100MB limit ඉක්මවාය.`));
        }

        reply(formatMsg("📤 *Uploading*", `✅ Convert සාර්ථකයි! (${sizeMB} MB)`)).catch(() => {});

        try {
            const buf = fs.readFileSync(filePath);
            await hansaka.sendMessage(from, {
                document: buf,
                mimetype: "video/mp4",
                fileName: `Anime_EP${epNumber}.mp4`,
                caption: formatMsg(`🎬 *Episode ${epNumber}*`, `✅ Download සාර්ථකයි!\n📁 Size: ${sizeMB} MB`)
            }, { quoted: mek });
            hansaka.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});
        } catch (sendErr) {
            reply(formatMsg("🔴 *Upload Error*", sendErr.message));
        } finally {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

    } catch (e) {
        console.error("--> [TRACKER] 🔴 CRITICAL ERROR: ", e);
        reply(formatMsg("🔴 *Error*", e.message)).catch(() => {});
    }
});

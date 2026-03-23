const { cmd } = require('../command');
const { ANIME } = require('@consumet/extensions');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ඔයා ඉල්ලපු අලුත් Assistant Olya ෆූටර් එක
const formatMsg = (title, body) =>
    `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`;

// =============================================
// PROVIDER LIST (fallback order)
// =============================================
const PROVIDERS = {
    gogoanime: () => new ANIME.Gogoanime(),
    zoro: () => new ANIME.Zoro()
};

const http = axios.create({
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
});

// =============================================
// HELPER: Try multiple providers for search
// =============================================
async function searchWithFallback(query) {
    const providerNames = Object.keys(PROVIDERS);
    let lastErr = null;
    for (const name of providerNames) {
        try {
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
    throw lastErr || new Error('All providers failed');
}

// =============================================
// HELPER: Fetch anime info with provider
// =============================================
async function fetchInfoWithFallback(animeId, providerName) {
    const names = providerName
        ? [providerName, ...Object.keys(PROVIDERS).filter(n => n !== providerName)]
        : Object.keys(PROVIDERS);
    let lastErr = null;
    for (const name of names) {
        try {
            const provider = PROVIDERS[name]();
            const info = await provider.fetchAnimeInfo(animeId);
            if (info?.episodes?.length > 0) return { info, providerName: name, provider };
        } catch (e) {
            console.error(`[${name}] fetchInfo error:`, e.message);
            lastErr = e;
        }
    }
    throw lastErr || new Error('Info fetch failed');
}

// =============================================
// HELPER: Fetch episode sources
// =============================================
async function fetchSources(provider, episodeId) {
    const data = await provider.fetchEpisodeSources(episodeId);
    return data?.sources || [];
}

// =============================================
// HELPER: Best quality selector
// =============================================
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
                `Referer: ${referer}\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n`,
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
            return reply(formatMsg("🔴 *Server Error*", 
                `Anime සෙවීමේදී දෝෂයක් ඇතිවිය.\n*Error:* ${e.message}\n\n⚠️ Package එක update කර නැවත උත්සාහ කරන්න.`));
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
// 2. DOWNLOAD COMMAND: .ep <number>
// =============================================
cmd({
    pattern: "ep",
    desc: "Download Anime Episode",
    category: "downloader",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(formatMsg("🔴 *Input Error*", "Episode number ලිවීමේ ආකාරය:\n*.ep 1*"));

        const epNumber = parseInt(q.trim());
        if (isNaN(epNumber) || epNumber < 1) return reply(formatMsg("🔴 *Input Error*", "නිවැරදි episode number: *.ep 1*"));

        if (!m.quoted) return reply(formatMsg("🔴 *Action Required*", "*.animevid* result message reply කරලා *.ep* ගහන්න!"));

        let rawText = m.quoted.text || m.quoted.caption || "";
        if (!rawText) {
            try {
                rawText = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption || "";
            } catch (_) {}
        }
        rawText = String(rawText);

        const anidMatch = rawText.match(/ANID:\s*([^\s|]+)\|([a-z]+)/i);
        if (!anidMatch) return reply(formatMsg("🔴 *ID Error*", "Anime ID හොයාගන්න බැරිවුණා. ආයෙත් *.animevid* ගහන්න."));

        const animeId = anidMatch[1].trim();
        const providerName = anidMatch[2].toLowerCase();

        await hansaka.sendMessage(from, { react: { text: "📥", key: mek.key } });
        await reply(formatMsg("📋 *Loading Episode*", `Episode ${epNumber} ලොඩ් කරමින්...`));

        let animeInfo, provider;
        try {
            const result = await fetchInfoWithFallback(animeId, providerName);
            animeInfo = result.info;
            provider = result.provider;
        } catch (e) {
            return reply(formatMsg("🔴 *Network Error*", e.message));
        }

        const epObj = animeInfo.episodes.find(e => e.number === epNumber);
        if (!epObj) return reply(formatMsg("🔴 *Not Found*", `Episode ${epNumber} නිකුත් නොවීය.`));

        await reply(formatMsg("🔗 *Getting Stream URL*", `Stream link ලබාගනිමින්...`));

        let sources;
        try {
            sources = await fetchSources(provider, epObj.id);
        } catch (e) {
            return reply(formatMsg("🔴 *Stream Error*", e.message));
        }

        const best = selectBestSource(sources);
        if (!best?.url) return reply(formatMsg("🔴 *Error*", "නිවැරදි stream URL නෑ."));

        const quality = best.quality || "HD";
        const streamUrl = best.url;

        await hansaka.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        await reply(formatMsg("🔄 *Downloading*", `🎬 Quality: ${quality}\nVideo convert කරමින් පවතී... ⏳`));

        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        const safeId = animeId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
        const fileName = `ep_${safeId}_${epNumber}_${Date.now()}.mp4`;
        const filePath = path.join(dataDir, fileName);

        try {
            await convertToMP4(streamUrl, filePath, 'https://gogoanime3.co/');
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

        await reply(formatMsg("📤 *Uploading*", `✅ Convert සාර්ථකයි! (${sizeMB} MB)`));

        try {
            const buf = fs.readFileSync(filePath);
            await hansaka.sendMessage(from, {
                document: buf,
                mimetype: "video/mp4",
                fileName: `Anime_EP${epNumber}_${quality}.mp4`,
                caption: formatMsg(`🎬 *Episode ${epNumber}*`, `✅ Download සාර්ථකයි!\n📁 Size: ${sizeMB} MB`)
            }, { quoted: mek });
            await hansaka.sendMessage(from, { react: { text: "✅", key: mek.key } });
        } catch (sendErr) {
            reply(formatMsg("🔴 *Upload Error*", sendErr.message));
        } finally {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

    } catch (e) {
        reply(formatMsg("🔴 *Error*", e.message));
    }
});

const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const formatMsg = (title, body) =>
    `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`;

// =============================================
// NEW: DIRECT API FETCHER (No Consumet Package! 🔥)
// =============================================
async function searchAnime(query) {
    // අපි API දෙකක් පාවිච්චි කරනවා, එකක් fail වුණොත් අනිත් එකෙන් ගන්න
    const apis = [
        `https://api.anispace.workers.dev/search/${encodeURIComponent(query)}`,
        `https://api-anime-dex.onrender.com/search/${encodeURIComponent(query)}`
    ];
    
    for (let url of apis) {
        try {
            const res = await axios.get(url, { timeout: 15000 });
            const data = res.data.results || res.data.data || res.data;
            if (Array.isArray(data) && data.length > 0) return data[0];
        } catch (e) {
            console.log(`[Search Failed] ${url}`);
        }
    }
    throw new Error("Anime එක සෙවීමේදී දෝෂයක්. සර්වර් කාර්යබහුලයි.");
}

async function getEpisodes(animeId) {
    const apis = [
        `https://api.anispace.workers.dev/anime/${animeId}`,
        `https://api-anime-dex.onrender.com/anime/${animeId}`
    ];
    
    for (let url of apis) {
        try {
            const res = await axios.get(url, { timeout: 15000 });
            const data = res.data.results || res.data.data || res.data;
            if (data.episodes) return data;
        } catch (e) {
            console.log(`[Info Failed] ${url}`);
        }
    }
    throw new Error("Episodes ලැයිස්තුව ලබාගත නොහැක.");
}

async function getStreamLink(episodeId) {
    const apis = [
        `https://api.anispace.workers.dev/episode/${episodeId}`,
        `https://api-anime-dex.onrender.com/episode/${episodeId}`
    ];
    
    for (let url of apis) {
        try {
            const res = await axios.get(url, { timeout: 15000 });
            const data = res.data.results || res.data.data || res.data.sources || res.data;
            
            let sources = Array.isArray(data) ? data : (data.sources || []);
            if (sources.length > 0) {
                // හොඳම Quality එක තෝරාගැනීම
                const best = sources.find(s => s.quality && s.quality.includes('720')) || 
                             sources.find(s => s.quality && s.quality.includes('1080')) || 
                             sources.find(s => s.quality && s.quality.includes('default')) || 
                             sources[0];
                if (best && best.url) return { url: best.url, quality: best.quality || 'HD' };
            }
        } catch (e) {
            console.log(`[Stream Failed] ${url}`);
        }
    }
    throw new Error("Stream link එක ලබාගත නොහැක.");
}

function convertToMP4(streamUrl, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(streamUrl)
            .inputOptions([
                '-headers', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n',
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
    desc: "Search Anime",
    category: "downloader",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(formatMsg("🔴 *Input Error*", "🤖 Anime නම ලිවීමේ ආකාරය:\n*.animevid Naruto*"));

        await hansaka.sendMessage(from, { react: { text: "🔍", key: mek.key } });
        await reply(formatMsg("🔍 *Searching...*", `"${q}" සොයමින් පවතී...⏳`));

        let anime;
        try {
            anime = await searchAnime(q);
        } catch (e) {
            return reply(formatMsg("🔴 *Server Error*", e.message));
        }

        let totalEp = "?";
        try {
            const info = await getEpisodes(anime.id);
            totalEp = info.totalEpisodes || info.episodes?.length || "?";
        } catch (_) {}

        const body =
            `🎬 *${anime.title || anime.name}*\n\n` +
            `📺 *Total Episodes:* ${totalEp}\n\n` +
            `👇 Download කිරීමට, *මේ message* reply කරලා:\n` +
            `*.ep 1* → Episode 1\n\n` +
            `> 📌 *ANID:* ${anime.id}`;

        try {
            await hansaka.sendMessage(from, {
                image: { url: anime.image || anime.img },
                caption: formatMsg("✅ *Anime Found!*", body)
            }, { quoted: mek });
        } catch (_) {
            await reply(formatMsg("✅ *Anime Found!*", body));
        }
        hansaka.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(()=>{});

    } catch (e) {
        reply(formatMsg("🔴 *Error*", e.message)).catch(()=>{});
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
        if (!q) return reply(formatMsg("🔴 *Input Error*", "Episode number එක දෙන්න."));
        const epNumber = parseInt(q.trim());

        let rawText = "";
        try {
            const quotedMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            rawText = m.quoted?.text || m.quoted?.caption || quotedMsg?.imageMessage?.caption || quotedMsg?.extendedTextMessage?.text || "";
        } catch (e) {}
        
        rawText = String(rawText);

        if (!rawText.includes("ANID:")) {
            return reply(formatMsg("🔴 *Action Required*", "*.animevid* result මැසේජ් එක *Reply* කරලා .ep කමාන්ඩ් එක ගහන්න."));
        }

        const anidMatch = rawText.match(/ANID:\s*([^\s|]+)/i);
        if (!anidMatch) return reply(formatMsg("🔴 *ID Error*", "Anime ID එක කියවාගත නොහැක."));

        const animeId = anidMatch[1].trim();

        hansaka.sendMessage(from, { react: { text: "📥", key: mek.key } }).catch(()=>{});
        reply(formatMsg("📋 *Loading Episode*", `Episode ${epNumber} ලොඩ් කරමින්...`)).catch(()=>{});

        let animeInfo;
        try {
            animeInfo = await getEpisodes(animeId);
        } catch (e) {
            return reply(formatMsg("🔴 *Server Error*", e.message));
        }

        const epObj = animeInfo.episodes.find(e => e.number === epNumber);
        if (!epObj) return reply(formatMsg("🔴 *Not Found*", `Episode ${epNumber} නිකුත් නොවීය.`));

        let streamData;
        try {
            streamData = await getStreamLink(epObj.id);
        } catch (e) {
            return reply(formatMsg("🔴 *Stream Error*", e.message));
        }

        reply(formatMsg("🔄 *Downloading*", `🎬 Quality: ${streamData.quality}\nVideo convert කරමින් පවතී... ⏳`)).catch(()=>{});

        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        const safeId = animeId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
        const fileName = `ep_${safeId}_${epNumber}_${Date.now()}.mp4`;
        const filePath = path.join(dataDir, fileName);

        try {
            await convertToMP4(streamData.url, filePath);
        } catch (ffErr) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return reply(formatMsg("🔴 *Convert Error*", "Video එක සැකසීමේදී දෝෂයක් ඇතිවිය."));
        }

        const fileSize = fs.statSync(filePath).size;
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);

        if (fileSize > 99 * 1024 * 1024) {
            fs.unlinkSync(filePath);
            return reply(formatMsg("🔴 *Too Large*", `File size ${sizeMB}MB - WhatsApp 100MB limit ඉක්මවාය.`));
        }

        reply(formatMsg("📤 *Uploading*", `✅ Convert සාර්ථකයි! (${sizeMB} MB)`)).catch(()=>{});

        try {
            const buf = fs.readFileSync(filePath);
            await hansaka.sendMessage(from, {
                document: buf,
                mimetype: "video/mp4",
                fileName: `Anime_EP${epNumber}.mp4`,
                caption: formatMsg(`🎬 *Episode ${epNumber}*`, `✅ Download සාර්ථකයි!\n📁 Size: ${sizeMB} MB`)
            }, { quoted: mek });
            hansaka.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(()=>{});
        } catch (sendErr) {
            reply(formatMsg("🔴 *Upload Error*", sendErr.message));
        } finally {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

    } catch (e) {
        reply(formatMsg("🔴 *Error*", e.message)).catch(()=>{});
    }
});

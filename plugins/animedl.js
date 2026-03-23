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
const FOOTER_TEXT = "© Olya MD - Hansaka P Fernando";

const formatMsg = (title, body) =>
    `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n> ${FOOTER_TEXT}`;

// Delete Message Helper
const deleteMsg = async (hansaka, from, key) => {
    try { await hansaka.sendMessage(from, { delete: key }); } catch (e) {}
};

// Config එකෙන් Anime Image එක Load කරගැනීම
const getAnimeImg = () => {
    try {
        if (fs.existsSync(config.ANIME_IMG)) {
            return fs.readFileSync(config.ANIME_IMG);
        }
        return null;
    } catch (e) {
        return null;
    }
};

// =============================================
// CLOUDFLARE API FETCHER
// =============================================
async function searchAnime(query) {
    const apis = [
        `https://api.anispace.workers.dev/search/${encodeURIComponent(query)}`,
        `https://api-anime-dex.onrender.com/search/${encodeURIComponent(query)}`
    ];
    for (let url of apis) {
        try {
            const res = await axios.get(url, { timeout: 15000 });
            const data = res.data.results || res.data.data || res.data;
            if (Array.isArray(data) && data.length > 0) return data[0];
        } catch (e) {}
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
        } catch (e) {}
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
            if (sources.length > 0) return sources;
        } catch (e) {}
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
            .outputOptions(['-c copy', '-bsf:a aac_adtstoasc', '-movflags +faststart'])
            .output(outputPath)
            .on('end', () => resolve(true))
            .on('error', (err) => reject(err))
            .run();
    });
}

// =============================================
// 1. MAIN COMMAND: .anime <name>
// =============================================
cmd({
    pattern: "anime",
    desc: "Search Anime and get category list",
    category: "downloader",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return reply(formatMsg("🔴 *Command Error*", "කරුණාකර ඔබට අවශ්‍ය Anime එකේ නම ලබා දෙන්න.\n\n📌 *නිවැරදි ආකාරය:*\n.anime <Anime නම>\n\n💡 *උදාහරණ:*\n.anime Naruto\n.anime Demon Slayer"));
        }

        await hansaka.sendMessage(from, { react: { text: "🔍", key: mek.key } });
        const statusMsg = await reply(formatMsg("🔍 *Searching...*", `"${q}" අන්තර්ජාලයෙන් සොයමින් පවතී...\nකරුණාකර රැඳී සිටින්න. ⏳`));

        let anime, info;
        try {
            anime = await searchAnime(q);
            info = await getEpisodes(anime.id);
        } catch (e) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Server Error*", e.message));
        }

        const totalEp = info.totalEpisodes || info.episodes?.length || 0;
        let body = `🎬 *${anime.title || anime.name}*\n\n📺 *Total Episodes:* ${totalEp}\n\n*📂 EPISODE CATEGORIES*\n`;
        
        if (totalEp <= 1) {
            body += `මෙය චිත්‍රපටයක් හෝ තනි කොටසක් පමණක් ඇති Anime එකකි.\n\n📌 *Download කිරීමට පහත අයුරින් Reply කරන්න:*\n*.e 1*`;
        } else {
            const chunks = Math.ceil(totalEp / 10);
            for (let i = 0; i < chunks; i++) {
                let start = (i * 10) + 1;
                let end = Math.min((i + 1) * 10, totalEp);
                body += `[ *${i + 1}* ] Episodes ${start} - ${end}\n`;
            }
            body += `\n📌 *Download කිරීමට අවශ්‍ය කාණ්ඩයේ අංකය, මේ පණිවිඩයට Reply කරමින් යවන්න.*\n*(උදාහරණ: .c 1)*`;
        }

        body += `\n\n> 📌 ANID: ${anime.id}`;

        await deleteMsg(hansaka, from, statusMsg.key); // පරණ status එක මකා දැමීම

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
        reply(formatMsg("🔴 *System Error*", "පද්ධතියේ දෝෂයක් ඇතිවිය. කරුණාකර නැවත උත්සාහ කරන්න.")).catch(()=>{});
    }
});

// =============================================
// 2. CATEGORY SELECTOR: .c <number>
// =============================================
cmd({
    pattern: "c",
    desc: "Select Anime Category",
    category: "downloader",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        if (!q) return;
        const catNum = parseInt(q.trim());
        
        let rawText = m.quoted?.text || m.quoted?.caption || mek.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption || "";
        if (!String(rawText).includes("ANID:")) return;

        const anidMatch = String(rawText).match(/ANID:\s*([^\s]+)/i);
        if (!anidMatch) return reply(formatMsg("🔴 *Error*", "Anime ID එක කියවාගත නොහැක."));
        const animeId = anidMatch[1].trim();

        const statusMsg = await reply(formatMsg("📂 *Fetching Data...*", `කාණ්ඩ අංක ${catNum} හි ලැයිස්තුව ලබාගනිමින්... ⏳`));

        const info = await getEpisodes(animeId);
        if (!info || !info.episodes) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", "Episodes සොයාගත නොහැක."));
        }

        const startIdx = (catNum - 1) * 10;
        const endIdx = startIdx + 10;
        const chunk = info.episodes.slice(startIdx, endIdx);

        if (chunk.length === 0) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Not Found*", "මෙම කාණ්ඩයේ Episodes නොමැත."));
        }

        let body = `📂 *EPISODES (${startIdx + 1} - ${Math.min(endIdx, info.episodes.length)})*\n\n`;
        chunk.forEach(ep => {
            const epTitle = ep.title ? ep.title.replace('Episode', 'Ep') : `Ep ${ep.number}`;
            body += `[ *${ep.number}* ] ${epTitle}\n`;
        });

        body += `\n📌 *Download කිරීමට අවශ්‍ය Episode අංකය, මේ පණිවිඩයට Reply කරමින් යවන්න.*\n*(උදාහරණ: .e ${chunk[0].number})*\n\n> 📌 ANID: ${animeId}`;

        await deleteMsg(hansaka, from, statusMsg.key); // පැරණි පණිවිඩය මකාදැමීම

        const animeImgBuf = getAnimeImg();
        await hansaka.sendMessage(from, {
            image: animeImgBuf ? { buffer: animeImgBuf } : { url: 'https://i.ibb.co/s93hdn6L/Olya-welcome.png' },
            caption: formatMsg("📜 *Episode List*", body)
        }, { quoted: mek });

    } catch (e) {
        reply(formatMsg("🔴 *Error*", e.message)).catch(()=>{});
    }
});

// =============================================
// 3. QUALITY BUTTONS: .e <number>
// =============================================
cmd({
    pattern: "e",
    desc: "Select Episode and Quality",
    category: "downloader",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        if (!q) return;
        const epNum = parseInt(q.trim());

        let rawText = m.quoted?.text || m.quoted?.caption || mek.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption || "";
        if (!String(rawText).includes("ANID:")) return;

        const anidMatch = String(rawText).match(/ANID:\s*([^\s]+)/i);
        if (!anidMatch) return reply(formatMsg("🔴 *Error*", "Anime ID එක කියවාගත නොහැක."));
        const animeId = anidMatch[1].trim();

        await hansaka.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        const statusMsg = await reply(formatMsg("🔗 *Fetching Links...*", `Episode ${epNum} සඳහා Download Links සොයමින් පවතී... ⏳`));

        const info = await getEpisodes(animeId);
        let epObj = info.episodes.find(e => parseInt(e.number) === epNum || parseInt(e.episode) === epNum);
        
        if (!epObj && epNum === 1 && info.episodes.length > 0) epObj = info.episodes[0];
        
        if (!epObj) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Not Found*", `Episode ${epNum} සොයාගත නොහැක.`));
        }

        const sources = await getStreamLink(epObj.id);
        const uniqueQualities = [...new Set(sources.map(s => s.quality))].filter(q => q && q !== 'backup' && q !== 'default');
        const displayQualities = uniqueQualities.slice(0, 3); 

        if (displayQualities.length === 0) {
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Error*", "Quality අගයන් සොයාගත නොහැක."));
        }

        let interactiveButtons = [];
        displayQualities.forEach(qual => {
            interactiveButtons.push({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ 
                    display_text: `🎥 ${qual}`, 
                    id: `.d ${epObj.id}|${qual}|${epNum}` 
                })
            });
        });

        await deleteMsg(hansaka, from, statusMsg.key); // පැරණි පණිවිඩය මකාදැමීම

        const animeImgBuf = getAnimeImg();
        const msgText = `🎬 *Episode ${epNum}*\n\n✅ ලින්ක් සොයාගැනීම සාර්ථකයි! ඔබට අවශ්‍ය Video Quality එක පහතින් තෝරන්න. 👇`;

        await sendInteractiveMessage(hansaka, from, {
            text: msgText,
            footer: FOOTER_TEXT,
            image: animeImgBuf ? { buffer: animeImgBuf } : { url: 'https://i.ibb.co/s93hdn6L/Olya-welcome.png' },
            aimode: true,
            interactiveButtons: interactiveButtons
        });
        
        hansaka.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(()=>{});

    } catch (e) {
        reply(formatMsg("🔴 *Error*", e.message)).catch(()=>{});
    }
});

// =============================================
// 4. DOWNLOAD EXECUTOR: .d (Triggered by Button)
// =============================================
cmd({
    pattern: "d",
    desc: "Download Executor",
    category: "downloader",
    filename: __filename
},
async (hansaka, mek, m, { from, q, reply }) => {
    try {
        if (!q) return;
        const [epId, quality, epNum] = q.split('|');
        if (!epId || !quality) return;

        // 1. Downloading Status
        let statusMsg = await reply(formatMsg("🔄 *Processing Video...*", `🎬 *Quality:* ${quality}\n\nබාගත කිරීම ආරම්භ කරමින් පවතී... කරුණාකර රැඳී සිටින්න. ⏳`));

        const sources = await getStreamLink(epId);
        const bestSource = sources.find(s => s.quality === quality) || sources[0];

        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        const safeId = epId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
        const fileName = `ep_${safeId}_${epNum}_${Date.now()}.mp4`;
        const filePath = path.join(dataDir, fileName);

        try {
            await convertToMP4(bestSource.url, filePath);
        } catch (ffErr) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Convert Error*", "Video එක සැකසීමේදී දෝෂයක් ඇතිවිය."));
        }

        const fileSize = fs.statSync(filePath).size;
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);

        if (fileSize > 99 * 1024 * 1024) {
            fs.unlinkSync(filePath);
            await deleteMsg(hansaka, from, statusMsg.key);
            return reply(formatMsg("🔴 *Limit Exceeded*", `File size ${sizeMB}MB - WhatsApp 100MB සීමාව ඉක්මවා ඇත.`));
        }

        // 2. Uploading Status
        await deleteMsg(hansaka, from, statusMsg.key);
        statusMsg = await reply(formatMsg("📤 *Uploading to WhatsApp...*", `✅ සකස් කිරීම සාර්ථකයි! (${sizeMB} MB)\n\nඔබගේ WhatsApp ගිණුමට වීඩියෝව Upload කරමින් පවතී... 🚀`));

        try {
            const buf = fs.readFileSync(filePath);
            await hansaka.sendMessage(from, {
                document: buf,
                mimetype: "video/mp4",
                fileName: `Anime_EP${epNum}_${quality}.mp4`,
                caption: formatMsg(`🎬 *Episode ${epNum}*`, `✅ Download සාර්ථකයි!\n📁 Size: ${sizeMB} MB\n🎥 Quality: ${quality}`)
            }, { quoted: mek });
            hansaka.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(()=>{});
        } catch (sendErr) {
            reply(formatMsg("🔴 *Upload Error*", sendErr.message));
        } finally {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            await deleteMsg(hansaka, from, statusMsg.key); // අන්තිම Upload මැසේජ් එකත් මකා දැමීම
        }

    } catch (e) {
        reply(formatMsg("🔴 *Error*", e.message)).catch(()=>{});
    }
});

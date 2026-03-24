const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const config = require('../config');
const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');

// =============================================
// GLOBAL DESIGNS & FOOTERS
// =============================================
const FOOTER_TEXT = "𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝";
const formatMsg = (title, body) =>
    `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n\n> ${FOOTER_TEXT}`;

// Message Delete Helper
const deleteMsg = async (hansaka, from, key) => {
    try { if (key) await hansaka.sendMessage(from, { delete: key }); } catch (e) {}
};

// Safe String Converter
const safeStr = (val) => {
    if (val === null || val === undefined) return "N/A";
    if (typeof val === 'object') return val.english || val.romaji || val.userPreferred || JSON.stringify(val);
    return String(val);
};

// =============================================
// CLOUDFLARE BYPASS & PROXY HELPERS
// =============================================
const getRandomUserAgent = () => {
    const agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0'
    ];
    return agents[Math.floor(Math.random() * agents.length)];
};

const createAxiosInstance = (url) => {
    return axios.create({
        timeout: 30000,
        headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        }
    });
};

const bypassCloudflare = async (url) => {
    const strategies = [
        async () => {
            const instance = createAxiosInstance(url);
            const response = await instance.get(url);
            return response.data;
        },
        async () => {
            const proxyUrl = `https://cors.isomorphic-git.org/${url}`;
            const response = await axios.get(proxyUrl, {
                headers: {
                    'User-Agent': getRandomUserAgent(),
                    'Referer': new URL(url).origin
                }
            });
            return response.data;
        },
        async () => {
            const textiseUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
            const response = await axios.get(textiseUrl);
            return response.data;
        }
    ];

    for (const strategy of strategies) {
        try {
            return await strategy();
        } catch (error) {
            continue;
        }
    }
    throw new Error('All bypass strategies failed');
};

// =============================================
// ENHANCED API FETCHERS WITH CLOUDFLARE BYPASS
// =============================================
async function searchAnimeList(query) {
    try {
        const url = `https://api.anispace.workers.dev/search/${encodeURIComponent(query)}`;
        const res = await axios.get(url, { timeout: 15000 });
        return res.data.results || res.data || [];
    } catch (error) {
        try {
            const searchUrl = `https://aniwatch.to/search?keyword=${encodeURIComponent(query)}`;
            const html = await bypassCloudflare(searchUrl);
            const $ = cheerio.load(html);
            const results = [];
            $('.film-list .film-item').each((i, elem) => {
                if (i >= 5) return false;
                const $elem = $(elem);
                results.push({
                    id: $elem.find('a').attr('href')?.replace('/anime/', '') || '',
                    title: $elem.find('.film-name').text().trim(),
                    image: $elem.find('img').attr('data-src') || $elem.find('img').attr('src'),
                    episodes: $elem.find('.film-episodes').text().trim() || 'N/A'
                });
            });
            return results;
        } catch (fallbackError) {
            return [];
        }
    }
}

async function getEpisodes(animeId) {
    try {
        const url = `https://api.anispace.workers.dev/anime/${animeId}`;
        const res = await axios.get(url, { timeout: 15000 });
        return res.data;
    } catch (error) {
        try {
            const animeUrl = `https://aniwatch.to/anime/${animeId}`;
            const html = await bypassCloudflare(animeUrl);
            const $ = cheerio.load(html);
            const episodes = [];
            $('.episodes-list .episode-item').each((i, elem) => {
                const $elem = $(elem);
                episodes.push({
                    id: $elem.find('a').attr('href')?.replace('/watch/', '') || '',
                    number: parseInt($elem.find('.episode-number').text()) || i + 1,
                    title: $elem.find('.episode-title').text().trim() || `Episode ${i + 1}`
                });
            });
            return {
                title: $('.anime-detail .title').text().trim(),
                image: $('.anime-detail .anime-poster img').attr('src'),
                totalEpisodes: episodes.length,
                episodes: episodes
            };
        } catch (fallbackError) {
            return { error: true };
        }
    }
}

function extractStreamUrl(encryptedData) {
    try {
        const regex = /(https?:\/\/[^\s"'<>]+\.(m3u8|mp4)[^\s"'<>]*)/g;
        const matches = encryptedData.match(regex);
        return matches ? matches[0] : null;
    } catch (e) {
        return null;
    }
}

async function getStreamLink(episodeId) {
    try {
        const url = `https://api.anispace.workers.dev/episode/${episodeId}`;
        const res = await axios.get(url, { timeout: 15000 });
        return res.data.sources || res.data;
    } catch (error) {
        try {
            const episodeUrl = `https://aniwatch.to/watch/${episodeId}`;
            const html = await bypassCloudflare(episodeUrl);
            const $ = cheerio.load(html);
            const scripts = $('script').map((i, elem) => $(elem).html()).get();
            const encryptedData = scripts.find(script => script.includes('data-source') || script.includes('streamUrl'));
            
            if (encryptedData) {
                const streamUrl = extractStreamUrl(encryptedData);
                if (streamUrl) return [{ quality: 'Auto', url: streamUrl }];
            }
            return [];
        } catch (fallbackError) {
            return [];
        }
    }
}

// =============================================
// VIDEO DOWNLOAD HELPER (FFMPEG)
// =============================================
const downloadStream = (url, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(url)
            .outputOptions('-c copy') // Fast stream copy
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => {
                console.error('FFmpeg Error:', err);
                reject(err);
            });
    });
};

// =============================================
// BOT COMMANDS (FINAL QUOTED QUIRK FIX)
// =============================================

// 1. Search Anime
cmd({
    pattern: "anime",
    alias: ["searchanime"],
    desc: "Search for an anime",
    category: "anime",
    react: "🎬"
}, async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply(formatMsg("Missing Input", "Please provide an anime name!\nExample: .anime Naruto"));
    try {
        // JID Fallback for extra safety
        const jid = from || m?.chat || mek?.chat || mek?.sender;
        
        // Removed { quoted: mek } which was causing the Baileys crash
        let loadingMsg = await hansaka.sendMessage(jid, { text: "Searching for details... 🕵️‍♂️" });
        
        const results = await searchAnimeList(q);
        if (!results || results.length === 0) {
            await deleteMsg(hansaka, jid, loadingMsg.key);
            return reply(formatMsg("Not Found", "No results found for your query."));
        }
        
        let listText = "Here are the top results:\n\n";
        results.forEach((anime, index) => {
            listText += `*${index + 1}. ${safeStr(anime.title)}*\n`;
            listText += `📺 Episodes: ${anime.episodes}\n`;
            listText += `🔗 ID: ${anime.id}\n\n`;
        });
        listText += "Use *.episodes <ID>* to get the episode list.";
        
        await deleteMsg(hansaka, jid, loadingMsg.key);
        // Removed quoted from here too
        await hansaka.sendMessage(jid, { image: { url: results[0].image }, caption: formatMsg("Anime Search Results", listText) });
        
    } catch (e) {
        console.error("Anime Command Error:", e);
        reply(formatMsg("System Error", `හරියටම ආපු Error එක:\n*${e.message}*`));
    }
});

// 2. Get Episodes
cmd({
    pattern: "episodes",
    alias: ["animelist"],
    desc: "Get episodes of an anime",
    category: "anime",
    react: "📑"
}, async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply(formatMsg("Missing Input", "Please provide an Anime ID!\nExample: .episodes naruto-shippuden-502"));
    try {
        const jid = from || m?.chat || mek?.chat || mek?.sender;
        let loadingMsg = await hansaka.sendMessage(jid, { text: "Fetching episodes... ⏳" });
        
        const data = await getEpisodes(q);
        if (data.error || !data.episodes || data.episodes.length === 0) {
            await deleteMsg(hansaka, jid, loadingMsg.key);
            return reply(formatMsg("Error", "Could not fetch episodes for this ID."));
        }
        
        let epText = `*Title:* ${safeStr(data.title)}\n*Total Episodes:* ${data.totalEpisodes}\n\n`;
        const limit = Math.min(data.episodes.length, 20);
        for (let i = 0; i < limit; i++) {
            let ep = data.episodes[i];
            epText += `*Ep ${ep.number}:* ${safeStr(ep.title)}\nID: ${ep.id}\n\n`;
        }
        
        if (data.episodes.length > 20) epText += `_...and ${data.episodes.length - 20} more episodes._\n\n`;
        epText += "Use *.watch <Episode_ID>* to get the video.";
        
        await deleteMsg(hansaka, jid, loadingMsg.key);
        await hansaka.sendMessage(jid, { image: { url: data.image }, caption: formatMsg("Episode List", epText) });
        
    } catch (e) {
        console.error("Episodes Command Error:", e);
        reply(formatMsg("Error", "An error occurred while fetching episodes."));
    }
});

// 3. Watch / Download Episode
cmd({
    pattern: "watch",
    alias: ["stream", "downloadanime"],
    desc: "Download and send the episode video directly",
    category: "anime",
    react: "🎥"
}, async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply(formatMsg("Missing Input", "Please provide an Episode ID!\nExample: .watch naruto-episode-1"));
    let loadingMsg, tempFilePath;
    try {
        const jid = from || m?.chat || mek?.chat || mek?.sender;
        loadingMsg = await hansaka.sendMessage(jid, { text: "Extracting stream links... 🔐" });
        
        const sources = await getStreamLink(q);
        if (!sources || sources.length === 0) {
            await deleteMsg(hansaka, jid, loadingMsg.key);
            return reply(formatMsg("Error", "Could not extract streaming links for this episode."));
        }

        const streamUrl = sources[0].url;
        const quality = sources[0].quality || 'Auto';
        
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        tempFilePath = path.join(tempDir, `anime_${Date.now()}.mp4`);

        await hansaka.sendMessage(jid, { text: `Downloading video (${quality})... Please wait, this might take a minute! ⏳`, edit: loadingMsg.key });

        await downloadStream(streamUrl, tempFilePath);
        await hansaka.sendMessage(jid, { text: "Uploading to WhatsApp... 🚀", edit: loadingMsg.key });

        await hansaka.sendMessage(jid, { 
            document: fs.readFileSync(tempFilePath), 
            mimetype: 'video/mp4',
            fileName: `${q} [${quality}].mp4`,
            caption: formatMsg("Download Complete", `Here is your episode! 🍿\nQuality: ${quality}`) 
        });

        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        await deleteMsg(hansaka, jid, loadingMsg.key);

    } catch (e) {
        console.error("Watch Command Error:", e);
        const jid = from || m?.chat || mek?.chat || mek?.sender;
        if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (loadingMsg) await deleteMsg(hansaka, jid, loadingMsg.key);
        reply(formatMsg("Error", "An error occurred while downloading the video. The file might be too large or the stream is broken."));
    }
});

module.exports = { searchAnimeList, getEpisodes, getStreamLink };

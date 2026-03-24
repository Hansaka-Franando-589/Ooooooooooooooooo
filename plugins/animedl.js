const { cmd } = require('../command');
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require('fs');
const path = require('path');
const config = require('../config');
const axios = require('axios');
const googleTTS = require('google-tts-api');
const { exec } = require('child_process');

// =============================================
// TELEGRAM API CONFIGURATION
// =============================================
const apiId = 36884998;
const apiHash = "c49aa7cecc8079e252f4c49379790700";
const sessionString = "1BQANOTEuMTA4LjU2LjEzMwG7oq1HrH2MdLQ5wZTQljax6swwg7BnveLkiznbkkHyS5TXAOaoi0U5qlUGCVRuSUuTnSIINgSLHCkL4NKEZC1bzb9B7QksWgwXYgl836NfYRsyGCVNhrmx5Zd3/jZZE/Q17NxyIAKwvVfTVoGh0jseQNCTLyhQ/3aRj+RgF/Ogjq/anUpelwJNDP2bIq7yF9GzruEqpA1UnUTAMbIsQFe7GvR9ZhXXfecMSwiW2qjNoJ0CKb10QO4fYqlm3fzvPp5AlrDfSVlQG2MPRpKRoy8rdGGfQ9pUMr8yQ3eGTiepQP3g6+T7pPnLfUpEQOl4bo1ZBFbeIhta0FnY7NyTcV/PsQ=="; 
const stringSession = new StringSession(sessionString);
const TARGET_CHANNEL = "@animehub6";

// =============================================
// HELPER FUNCTIONS
// =============================================
const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getSeriesName = (filename) => {
    let base = filename.replace(/\.[^/.]+$/, ""); 
    let match = base.match(/^(.*?)(?:\s*-\s*\d{1,4}|\s+Ep\s*\d+|\s+Episode\s*\d+|\s*E\d+|_\d+|_Ep_\d+|\[\d+\])/i);
    let sName = match ? match[1].trim() : base.trim();
    sName = sName.replace(/^\[.*?\]\s*/, "").trim(); 
    sName = sName.replace(/^@.*?\s*/, "").trim(); 
    return sName || "Anime Series";
};

// =============================================
// SESSION MANAGEMENT
// =============================================
const userAnimeSessions = {};

// =============================================
// SEARCH COMMAND
// =============================================
cmd({
    pattern: "anime",
    alias: ["getanime", "downloadanime"],
    desc: "Search and paginated download anime from Telegram",
    category: "anime",
    react: "🕵️‍♀️"
}, async (hansaka, mek, m, { from, q, reply }) => {
    if (!q) return reply("✦ ━━━━━━━━━━━━━ ✦\n❗ *කරුණාකර ඔබට අවශ්‍ය ඇනිමෙ (Anime) එකෙහි නම ලබා දෙන්න...*\n> උදාහරණ: .anime naruto\n✦ ━━━━━━━━━━━━━ ✦");
    
    if (userAnimeSessions[from]) clearTimeout(userAnimeSessions[from].timer);

    let uName = m.pushName || "පරිශීලක";
    let loadTxt = `✦ ━━━━━━━━━━━━━━━ ✦
     *⚙️ System Analysis*
✦ ━━━━━━━━━━━━━━━ ✦

👤 *පරිශීලක:* ${uName}
🔍 *සෙවුම් පරාමිතිය:* '${q}'

ඕල්යා මූලික දත්ත ගබඩාව (Olya Main Datacenter) සමඟ සම්බන්ධ වෙමින් පවතී. කරුණාකර පද්ධති විශ්ලේෂණය අවසන් වනතුරු රැඳී සිටින්න... ⚙️

> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;

    let loadingMsg = await hansaka.sendMessage(from, { text: loadTxt }, { quoted: mek });
    
    let client;
    try {
        client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
        await client.connect();

        const messages = await client.getMessages(TARGET_CHANNEL, {
            search: q,
            limit: 1500
        });

        if (messages.length === 0) {
            await client.disconnect();
            let errTxt = `✦ ━━━━━━━━━━━━━ ✦\n⚠️ *දෝෂයකි: ගැලපීම් නොමැත*\n✦ ━━━━━━━━━━━━━ ✦\n\nදත්ත ගබඩාව තුළ අදාළ සෙවුම් පරාමිතියට (Search Parameter) ගැලපෙන ප්‍රතිඵල හමු නොවිණි. කරුණාකර වෙනත් නාමයක් ලබා දී පද්ධතිය නැවත ක්‍රියාත්මක කරන්න.\n\n> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;
            return hansaka.sendMessage(from, { text: errTxt, edit: loadingMsg.key });
        }

        let episodes = [];
        messages.forEach(msg => {
            if (msg.document && msg.document.attributes) {
                const fAttr = msg.document.attributes.find(a => a.className === "DocumentAttributeFilename");
                if (fAttr) {
                    episodes.push({ 
                        msgObj: msg, 
                        name: fAttr.fileName, 
                        size: msg.document.size, 
                        ext: '.' + fAttr.fileName.split('.').pop()
                    });
                }
            }
        });

        if (episodes.length === 0) {
            await client.disconnect();
            let errTxt = `✦ ━━━━━━━━━━━━━ ✦\n⚠️ *දෝෂයකි: ගොනු නොමැත*\n✦ ━━━━━━━━━━━━━ ✦\n\nඅදාළ නාමයට ගැලපෙන වලංගු වීඩියෝ ගොනු කිසිවක් සේවාදායකයේ හමු නොවීය.\n\n> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;
            return hansaka.sendMessage(from, { text: errTxt, edit: loadingMsg.key });
        }

        let groups = {};
        episodes.forEach(ep => {
            let sName = getSeriesName(ep.name);
            if (!groups[sName]) groups[sName] = [];
            groups[sName].push(ep);
        });

        let seriesNames = Object.keys(groups);

        userAnimeSessions[from] = {
            step: 1,
            groups,
            seriesNames,
            client,
            loadingKey: loadingMsg.key,
            orgMsg: mek,
            timer: setTimeout(() => { delete userAnimeSessions[from]; if(client) client.disconnect(); }, 5 * 60 * 1000)
        };

        if (seriesNames.length === 1) {
             let singleName = seriesNames[0];
             userAnimeSessions[from].selectedSeries = singleName;
             userAnimeSessions[from].episodes = groups[singleName].sort((a,b) => a.name.localeCompare(b.name));
             userAnimeSessions[from].step = 2; 
             return await sendChunkSelection(hansaka, from, userAnimeSessions[from], mek);
        }

        let listText = `✦ ━━━━━━━━━━━━━━━ ✦
      *📊 Query Results*
✦ ━━━━━━━━━━━━━━━ ✦

දත්ත ගබඩාවෙන් ලබාගත් ගැලපෙන කතා මාලාවන් පහත දැක්වේ. 
ඊළඟ පියවර සඳහා අවශ්‍ය කතාමාලාවේ *අංකය* (Index Number) පද්ධතිය වෙත Reply කරන්න. 👇

`;
        seriesNames.forEach((name, idx) => {
            listText += `*${idx + 1}️⃣* ${name}\n`;
        });
        
        listText += `\n> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;
        await hansaka.sendMessage(from, { text: listText, edit: loadingMsg.key });
        userAnimeSessions[from].loadingKey = null;
        
    } catch(e) {
        console.error("Anime Search Error:", e);
        if (client) await client.disconnect();
        let crashTxt = `✦ ━━━━━━━━━━━━━ ✦\n⚠️ *පද්ධති දෝෂයකි*\n✦ ━━━━━━━━━━━━━ ✦\n\nදත්ත සෙවීමේදී අභ්‍යන්තර දෝෂයක් හටගැනිණි. කරුණාකර පසුව නැවත උත්සාහ කරන්න.\n\n> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;
        hansaka.sendMessage(from, { text: crashTxt, edit: loadingMsg?.key });
    }
});

// =============================================
// SUB-HANDLER FOR ANIMEDL SESSION (NATIVE)
// =============================================
cmd({
    filter: (text, ex) => {
        let from = ex && ex.message && ex.message.key ? ex.message.key.remoteJid : null;
        return from ? !!userAnimeSessions[from] : false;
    },
    dontAddCommandList: true,
    filename: __filename
}, async (hansaka, mek, m, { from, body, reply }) => {
    const session = userAnimeSessions[from];
    if (!session || !body) return;

    // Advanced search: extract the last valid number in the text block (handles message copy-pasting)
    let numMatches = body.match(/\d+/g);
    if (!numMatches) return;
    let num = parseInt(numMatches[numMatches.length - 1]);
    if (isNaN(num)) return;
    
    console.log(`[AnimeDL] Active Session Found for ${from}. User selected: ${num}. Step: ${session.step}`);

    if (session.step === 1) {
        if (num < 1 || num > session.seriesNames.length) return reply("✦ ━━━━━━━━━━━━━ ✦\n❌ *අවලංගු අංකයකි*\n✦ ━━━━━━━━━━━━━ ✦");
        
        await hansaka.sendMessage(from, { react: { text: "⏳", key: mek.key } }).catch(()=>{});
        console.log(`[AnimeDL] Step 1 accepted. Selected Series: ${session.seriesNames[num - 1]}`);
        
        clearTimeout(session.timer);
        session.timer = setTimeout(() => { delete userAnimeSessions[from]; if(session.client) session.client.disconnect(); }, 5 * 60 * 1000);

        let selectedName = session.seriesNames[num - 1];
        session.selectedSeries = selectedName;
        session.episodes = session.groups[selectedName].sort((a, b) => a.name.localeCompare(b.name));
        session.step = 2;

        // Background TTS Generation to prevent hanging
        (async () => {
            try {
                const jikanReq = axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(selectedName)}&limit=1`, { timeout: 8000 });
                let res = await jikanReq.catch(() => null);
                let syn = "Synopsis details currently unavailable in the database.";
                if (res && res.data && res.data.data && res.data.data.length > 0) {
                    if (res.data.data[0].synopsis) {
                        syn = res.data.data[0].synopsis.split('\n')[0].substring(0, 100);
                    }
                }
                
                let textToSpeak = `Hello. I am Olya Assistant by Hansaka Fernando. Data Retrieval initiated. ${selectedName}. ${syn}`;
                let audioUrl = googleTTS.getAudioUrl(textToSpeak, { lang: 'en', slow: false });
                
                let tDir = path.join(__dirname, '../temp');
                if(!fs.existsSync(tDir)) fs.mkdirSync(tDir);
                let tIn = path.join(tDir, `tin_${Date.now()}.mp3`);
                let tOut = path.join(tDir, `tout_${Date.now()}.mp3`);
                
                let audData = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 8000 });
                let rawBuffer = Buffer.from(audData.data, 'binary');
                fs.writeFileSync(tIn, rawBuffer);
                
                // Simpler robotic effect to ensure ffmpeg compatibility
                let cmdStr = `ffmpeg -y -i "${tIn}" -filter_complex "tremolo=f=8:d=0.8,flanger=delay=5:depth=2" "${tOut}"`;
                
                await new Promise((resolve) => {
                    exec(cmdStr, (err, stdout, stderr) => {
                        if (err) console.error("[AnimeDL] FFmpeg error:", err.message);
                        resolve();
                    });
                });
                
                if (fs.existsSync(tOut)) {
                    await hansaka.sendMessage(from, { audio: fs.readFileSync(tOut), mimetype: 'audio/mp4', ptt: true }, { quoted: mek });
                    fs.unlinkSync(tOut);
                } else if (fs.existsSync(tIn)) {
                    await hansaka.sendMessage(from, { audio: fs.readFileSync(tIn), mimetype: 'audio/mp4', ptt: true }, { quoted: mek });
                }
                if (fs.existsSync(tIn)) fs.unlinkSync(tIn);
            } catch(e) { console.error("Robotic Voice Err:", e.message); }
        })();

        console.log(`[AnimeDL] Sending Chunk Selection...`);
        await sendChunkSelection(hansaka, from, session, mek);
        return;
    }

    if (session.step === 2) {
        let maxChunks = Math.ceil(session.episodes.length / 10);
        if (num < 1 || num > maxChunks) return reply("✦ ━━━━━━━━━━━━━ ✦\n❌ *අවලංගු කාණ්ඩ අංකයකි*\n✦ ━━━━━━━━━━━━━ ✦");

        clearTimeout(session.timer);
        session.timer = setTimeout(() => { delete userAnimeSessions[from]; if(session.client) session.client.disconnect(); }, 5 * 60 * 1000);

        let start = (num - 1) * 10;
        let pagedEpisodes = session.episodes.slice(start, start + 10);
        session.currentChunk = pagedEpisodes;
        session.step = 3;

        let listText = `✦ ━━━━━━━━━━━━━━━ ✦
   *📥 Episode Selection*
✦ ━━━━━━━━━━━━━━━ ✦

තෝරාගත් කාණ්ඩයට අදාළ වීඩියෝ ගොනු ලැයිස්තුව පහත දැක්වේ. බාගත කරගැනීම සඳහා අදාළ ගොනුවේ *අංකය* (Index Number) පද්ධතිය වෙත Reply කරන්න. 👇

`;
        pagedEpisodes.forEach((ep, idx) => {
            listText += `*${idx + 1}️⃣* ${ep.name.replace(/\.[^/.]+$/, "")} - (${formatSize(ep.size)})\n`;
        });
        listText += `\n> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;

        await hansaka.sendMessage(from, { react: { text: "🎬", key: mek.key } });
        await hansaka.sendMessage(from, { text: listText }, { quoted: mek });
        return;
    }

    if (session.step === 3) {
        if (num < 1 || num > session.currentChunk.length) return reply("✦ ━━━━━━━━━━━━━ ✦\n❌ *අවලංගු වීඩියෝ අංකයකි*\n✦ ━━━━━━━━━━━━━ ✦");

        let selectedEp = session.currentChunk[num - 1];
        let client = session.client;
        delete userAnimeSessions[from]; 
        
        await downloadAndSendAnime(hansaka, from, selectedEp, client, mek);
    }
});

// =============================================
// SUB-FUNCTIONS
// =============================================
async function sendChunkSelection(hansaka, from, session, mek) {
    let epCount = session.episodes.length;
    let listText = `✦ ━━━━━━━━━━━━━━━ ✦
   *🎬 Series Confirmed*
✦ ━━━━━━━━━━━━━━━ ✦

📌 *තෝරාගත් මාලාව:* ${session.selectedSeries}
📂 *මුළු ගොනු ගණන:* ${epCount}

දත්ත පහසුවෙන් ලබාදීම සඳහා පද්ධතිය විසින් ගොනු කාණ්ඩගත (Categorized) කර ඇත. කරුණාකර ඔබට අවශ්‍ය එපිසෝඩ් කාණ්ඩයේ *අංකය* Reply කරන්න. 👇

`;
    
    let chunkIdx = 1;
    for (let i = 0; i < epCount; i += 10) {
        let end = Math.min(i + 10, epCount);
        listText += `*${chunkIdx}️⃣* එපිසෝඩ් ${i + 1} සිට ${end} දක්වා\n`;
        chunkIdx++;
    }
    listText += `\n> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;

    if (mek) await hansaka.sendMessage(from, { react: { text: "📂", key: mek.key } });
    
    if (session.loadingKey) {
        await hansaka.sendMessage(from, { text: listText, edit: session.loadingKey });
        session.loadingKey = null;
    } else {
        await hansaka.sendMessage(from, { text: listText }, { quoted: mek });
    }
}

async function downloadAndSendAnime(hansaka, from, episode, client, mek) {
    await hansaka.sendMessage(from, { react: { text: "🚀", key: mek.key } });
    
    let progMsg = await hansaka.sendMessage(from, { text: "✦ ━━━━━━━━━━━━━━ ✦\n📶 *Direct Streaming Initiated...*\n✦ ━━━━━━━━━━━━━━ ✦\n\nඕල්යා පද්ධතිය විසින් Telegram සේවාදායකයේ සිට WhatsApp වෙතට කෙලින්ම ගොනුව (Zero-Delay Pipe) යොමු කිරීම ආරම්භ කර ඇත...\n\n> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇" });
    const eKey = progMsg.key;
    
    let cleanName = episode.name.replace(/\.[^/.]+$/, "");
    let newFileName = `${cleanName} - By OLYA${episode.ext}`;
    
    const FINAL_CAPTION = `✧ ━━ 𝓞𝓛𝓨𝓐 𝓐𝓝𝓘𝓜𝓔 𝓓𝓞𝓦𝓝𝓛𝓞𝓐𝓓𝓔𝓡 ━━ ✧
   [ 𝗔𝗱𝘃𝗮𝗻𝗰𝗲𝗱 𝗔𝗜 𝗥𝗲𝘁𝗿𝗶𝗲𝘃𝗮𝗹 𝗦𝘆𝘀𝘁𝗲𝗺 ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━

[⚙️] පද්ධති විශ්ලේෂණය (System Analysis):
───────────────────────────
මෙය ඕල්යා කෘත්‍රිම බුද්ධි පද්ධතිය (Olya AI System) හරහා ජනනය කරන ලද ස්වයංක්‍රීය පණිවිඩයකි. ඔබේ ඉල්ලීමට අනුව දත්ත ගබඩාව (Data Storage) පිරික්සා අවශ්‍ය වීඩියෝ ගොනුව සාර්ථකව නිස්සාරණය කරන ලදී.

[📁] ගොනු තොරතුරු (File Specifications):
───────────────────────────
🎬 ගොනු නාමය : ${cleanName}
💾 ගොනු ධාරිතාව : ${formatSize(episode.size)}
🎥 විභේදනය : High Definition (HD)
🛠️ දත්ත මූලාශ්‍රය : ඕල්යා ප්‍රධාන දත්ත ගබඩාව (Olya Main Datacenter)
✅ තත්ත්වය : 100% ආරක්ෂිතයි (Secured & Verified)

[📝] පද්ධතියේ උපදෙස් (System Instructions):
───────────────────────────
කරුණාකර ඉහත ගොනුව ඔබගේ උපාංගයට (Device) බාගත (Download) කරගන්න. මෙම වීඩියෝව වාදනය කිරීම සඳහා යාවත්කාලීන වූ වීඩියෝ වාදකයක් භාවිත කරන ලෙස ඕල්යා පද්ධතිය නිර්දේශ කරයි (උදා: MX Player, VLC). තවද, වෙනත් කතාමාලා අවශ්‍ය නම්, පද්ධතිය වෙත අදාළ විධානය (Command) නැවත ලබා දෙන්න. පද්ධතිය ඔබගේ ඊළඟ විධානය බලාපොරොත්තු වේ. 🤖✨

> ⚠️ [ නීතිමය නිවේදනය / Copyright Notice ]
> ©️ This intelligent system is purely developed to provide high-quality anime metadata and resources seamlessly. Unauthorized modifications, system injections, and redistributions of this automated mechanism are strictly prohibited without official permission. All rights belong to the original developers.

✦ ━━━━━━━━━━━━━━━━━━━━━━━━━ ✦
  📡 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇 𝒮𝓎𝓈𝓉𝑒𝓂
  👨‍💻 𝒢𝑒𝓃𝑒𝓇𝒶𝓉𝑒𝒹 𝐵𝓎 𝐻𝒶𝓃𝓈𝒶𝓀𝒶 𝒫. 𝐹𝑒𝓇𝓃𝒶𝓃𝒹𝑜`;

    let thumbData = null;
    try {
        if (config.ANIME_IMG && require('fs').existsSync(config.ANIME_IMG)) {
            thumbData = require('fs').readFileSync(config.ANIME_IMG);
        }
    } catch(et){}

    const { PassThrough } = require('stream');
    const directPipe = new PassThrough();

    let sendObj = {
        document: { stream: directPipe },
        mimetype: episode.ext.includes('mkv') ? 'video/x-matroska' : 'video/mp4',
        fileName: newFileName,
        caption: FINAL_CAPTION
    };

    if(thumbData) {
        sendObj.contextInfo = {
            externalAdReply: {
                title: cleanName,
                body: "Powered by OLYA Server System",
                mediaType: 1,
                thumbnail: thumbData
            }
        };
    }

    try {
        // Start concurrent processing: Upload stream initiates reading, while Client downloads to stream.
        let uploadPromise = hansaka.sendMessage(from, sendObj, { quoted: mek });
        
        let lastProgTime = Date.now();
        let lastDownloaded = 0;

        let downloadPromise = client.downloadMedia(episode.msgObj, {
            outputFile: directPipe,
            progressCallback: async (downloaded, total) => {
                let now = Date.now();
                if (now - lastProgTime > 4000) { 
                    let dlDiff = downloaded - lastDownloaded;
                    let timeDiffSec = (now - lastProgTime) / 1000;
                    let speedBytes = dlDiff / timeDiffSec;
                    let speedStr = formatSize(speedBytes) + '/s';
                    
                    lastProgTime = now;
                    lastDownloaded = downloaded;
                    
                    let pct = Math.floor((downloaded / total) * 100);
                    if (pct > 5 && pct < 98) {
                        let filled = Math.floor(pct / 10);
                        let barStr = `[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}]`;
                        let txt = `✦ ━━━━━━━━━━━━━━━ ✦
     *📥 Direct Traffic Status*
✦ ━━━━━━━━━━━━━━━ ✦

නලයක් හරහා සජීවීව දත්ත සම්ප්‍රේෂණය වෙමින් පවතී (Live Streaming Pipeline)...
${barStr} ${pct}%

⚡ දත්ත හුවමාරු වේගය: ${speedStr}

> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;
                        await hansaka.sendMessage(from, { text: txt, edit: eKey }).catch(()=>{});
                    }
                }
            }
        });

        // Wait for Telegram to completely feed the stream
        await downloadPromise;
        directPipe.end(); // Seal the pipe so WhatsApp knows it is done receiving bytes

        // Wait for WhatsApp chunker to confirm success
        await uploadPromise;

        await client.disconnect();
        try { await hansaka.sendMessage(from, { delete: eKey }); } catch(err){}

    } catch(err) {
        console.error("Direct Core Stream Error:", err);
        directPipe.destroy(err);
        if (client) await client.disconnect();
        let errTxt = `✦ ━━━━━━━━━━━━━ ✦\n⚠️ *සේවාදායකයේ දෝෂයකි*\n✦ ━━━━━━━━━━━━━ ✦\n\nSystem Core එකෙන් Streaming ක්‍රියාවලිය අතරමග නවතා දැමීය. (Pipe Error) පසුව උත්සාහ කරන්න.`;
        hansaka.sendMessage(from, { text: errTxt, edit: eKey }).catch(()=>{});
    }
}

module.exports = { };

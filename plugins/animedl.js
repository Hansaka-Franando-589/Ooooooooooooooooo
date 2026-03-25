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

const sendChunkSelection = async (hansaka, from, session, mek) => {
    let totalEps = session.episodes.length;
    let listText = `✦ ━━━━━━━━━━━━━━━ ✦
   *📁 Series Selected: ${session.selectedSeries}*
✦ ━━━━━━━━━━━━━━━ ✦

සමස්ත කථාංග ගණන: ${totalEps}
කරුණාකර ඔබට අවශ්‍ය කථාංග කාණ්ඩය තෝරන්න:\n\n`;

    let maxChunks = Math.ceil(totalEps / 10);
    for (let i = 0; i < maxChunks; i++) {
        let start = i * 10 + 1;
        let end = Math.min((i + 1) * 10, totalEps);
        listText += `*${i + 1}️⃣* කථාංග ${start} සිට ${end} දක්වා\n`;
    }
    listText += `\n> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;
    await hansaka.sendMessage(from, { text: listText }, { quoted: mek });
};

// =============================================
// MEMORY-SAFE DOWNLOAD FUNCTION
// =============================================
async function downloadAndSendAnime(hansaka, from, episode, client, mek) {
    await hansaka.sendMessage(from, { react: { text: "🚀", key: mek.key } }).catch(()=>{});
    
    let progMsg = await hansaka.sendMessage(from, { text: "✦ ━━━━━━━━━━━━━━ ✦\n📶 *Memory-Safe System Engine*\n✦ ━━━━━━━━━━━━━━ ✦\n\nඕල්යා පද්ධතිය විසින් Node.js Memory Limits Bypass කරමින් ගොනුව සුරක්ෂිතව (Chunk Iteration) ලබා ගනිමින් පවතී...\n\n> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇" }, { quoted: mek });
    const eKey = progMsg.key;
    
    let cleanName = episode.name.replace(/\.[^/.]+$/, "");
    let newFileName = `${cleanName} - By OLYA${episode.ext}`;
    
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const tempFilePath = path.join(tempDir, newFileName.replace(/[^a-zA-Z0-9.\-_ ]/g, ""));

    const FINAL_CAPTION = `✧ ━━ 𝓞𝓛𝓨𝓐 𝓐𝓝𝓘𝓜𝓔 𝓓𝓞𝓦𝓝𝓛𝓞𝓐𝓓𝓔𝓡 ━━ ✧
   [ 𝗔𝗱𝘃𝗮𝗻𝗰𝗲𝗱 𝗔𝗜 𝗥𝗲𝘁𝗿𝗶𝗲𝘃𝗮𝗹 𝗦𝘆𝘀𝘁𝗲𝗺 ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━

[⚙️] පද්ධති විශ්ලේෂණය (System Analysis):
───────────────────────────
මෙය ඕල්යා කෘත්‍රිම බුද්ධි පද්ධතිය හරහා ජනනය කරන ලද ස්වයංක්‍රීය පණිවිඩයකි. OOM (Out-of-Memory) සීමාවන් බිඳ දමමින් මෙම ගොනුව සාර්ථකව උඩුගත (Upload) කරන ලදී.

[📁] ගොනු තොරතුරු (File Specifications):
───────────────────────────
🎬 ගොනු නාමය : ${cleanName}
💾 ගොනු ධාරිතාව : ${formatSize(episode.size)}
🎥 විභේදනය : High Definition (HD)
🛠️ දත්ත මූලාශ්‍රය : ඕල්යා ප්‍රධාන දත්ත ගබඩාව (Olya Main Datacenter)
✅ තත්ත්වය : 100% ආරක්ෂිතයි (Secured & Verified)

[📝] පද්ධතියේ උපදෙස් (System Instructions):
───────────────────────────
කරුණාකර ඉහත ගොනුව ඔබගේ උපාංගයට බාගත කරගන්න. වීඩියෝව වාදනය කිරීමට යාවත්කාලීන වාදකයක් භාවිත කරන්න (උදා: MX Player).

✦ ━━━━━━━━━━━━━━━━━━━━━━━━━ ✦
  📡 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇 𝒮𝓎𝓈𝓉𝑒𝓂
  👨‍💻 𝒢𝑒𝓃𝑒𝓇𝒶𝓉𝑒𝒹 𝐵𝓎 𝐻𝒶𝓃𝓈𝒶𝓀𝒶 𝒫. 𝐹𝑒𝓇𝓃𝒶𝓃𝒹𝑜`;

    let thumbData = null;
    try {
        if (config.ANIME_IMG && fs.existsSync(config.ANIME_IMG)) {
            thumbData = fs.readFileSync(config.ANIME_IMG);
        }
    } catch(et){}

    try {
        const fileWriter = fs.createWriteStream(tempFilePath);
        const tgGenerator = client.iterDownload({
            file: episode.msgObj.media,
            requestSize: 1024 * 1024 // 1MB chunks
        });

        let totalDownloaded = 0;
        let totalSize = episode.size || 1;
        let lastProgTime = Date.now();
        let lastDownloaded = 0;

        for await (const chunk of tgGenerator) {
            fileWriter.write(chunk);
            totalDownloaded += chunk.length;

            let now = Date.now();
            if (now - lastProgTime > 3500) { 
                let dlDiff = totalDownloaded - lastDownloaded;
                let timeDiffSec = (now - lastProgTime) / 1000;
                let speedBytes = dlDiff / timeDiffSec;
                let speedStr = formatSize(speedBytes) + '/s';
                
                lastProgTime = now;
                lastDownloaded = totalDownloaded;
                
                let pct = Math.floor((totalDownloaded / totalSize) * 100);
                if (pct > 2 && pct < 98) {
                    let filled = Math.floor(pct / 10);
                    let barStr = `[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}]`;
                    let txt = `✦ ━━━━━━━━━━━━━━━ ✦
     *📥 Storage Stream Status*
✦ ━━━━━━━━━━━━━━━ ✦

OOM Memory බාධාවකින් තොරව (Safe-Buffer) ඔබගේ ගොනුව ලබා ගනිමින් පවතී...
${barStr} ${pct}%

⚡ දත්ත හුවමාරු වේගය: ${speedStr}

> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;
                    await hansaka.sendMessage(from, { text: txt, edit: eKey }).catch(()=>{});
                }
            }
        }
        
        fileWriter.end();
        await new Promise((resolve) => fileWriter.once('finish', resolve));

        await hansaka.sendMessage(from, { text: "✦ ━━━━━━━━━━━━ ✦\n✅ ගොනුව සුරක්ෂිතව තැටියට ලියවා ඇත. උඩුගත කිරීම (Upload) ආරම්භ වේ...\n✦ ━━━━━━━━━━━━ ✦", edit: eKey }).catch(()=>{});

        let sendObj = {
            document: { url: tempFilePath },
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

        await hansaka.sendMessage(from, sendObj, { quoted: mek });
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        await client.disconnect();
        try { await hansaka.sendMessage(from, { delete: eKey }); } catch(err){}

    } catch(err) {
        console.error("Extreme Storage Stream Error:", err);
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (client) await client.disconnect();
        let errTxt = `✦ ━━━━━━━━━━━━━ ✦\n⚠️ *සේවාදායකයේ දෝෂයකි*\n✦ ━━━━━━━━━━━━━ ✦\n\nDisk Stream එක අතරමැද නවතා දැමීය. පසුව උත්සාහ කරන්න. Er: ${err.message}`;
        hansaka.sendMessage(from, { text: errTxt, edit: eKey }).catch(()=>{});
    }
}

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
ඊළඟ පියවර සඳහා අවශ්‍ය කතාමාලාවේ *අංකය* (Index Number) පද්ධතිය වෙත Reply කරන්න. 👇\n\n`;
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

    let numMatches = body.match(/\d+/g);
    if (!numMatches) return;
    let num = parseInt(numMatches[numMatches.length - 1]);
    if (isNaN(num)) return;

    if (session.step === 1) {
        if (num < 1 || num > session.seriesNames.length) return reply("✦ ━━━━━━━━━━━━━ ✦\n❌ *අවලංගු අංකයකි*\n✦ ━━━━━━━━━━━━━ ✦");
        
        await hansaka.sendMessage(from, { react: { text: "⏳", key: mek.key } }).catch(()=>{});
        
        clearTimeout(session.timer);
        session.timer = setTimeout(() => { delete userAnimeSessions[from]; if(session.client) session.client.disconnect(); }, 5 * 60 * 1000);

        let selectedName = session.seriesNames[num - 1];
        session.selectedSeries = selectedName;
        session.episodes = session.groups[selectedName].sort((a, b) => a.name.localeCompare(b.name));
        session.step = 2;

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
                
                let cmdStr = `ffmpeg -y -i "${tIn}" -filter_complex "tremolo=f=8:d=0.8,flanger=delay=5:depth=2" "${tOut}"`;
                
                await new Promise((resolve) => {
                    exec(cmdStr, (err, stdout, stderr) => resolve());
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

තෝරාගත් කාණ්ඩයට අයත් කොටස් පහත දැක්වේ.
ඔබට අවශ්‍ය කොටසේ අංකය (Index Number) Reply කරන්න. 👇\n\n`;

        pagedEpisodes.forEach((ep, idx) => {
            listText += `*${idx + 1}️⃣* ${ep.name} (${formatSize(ep.size)})\n`;
        });
        
        listText += `\n> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;
        await hansaka.sendMessage(from, { text: listText }, { quoted: mek });
        return;
    }
    
    if (session.step === 3) {
        if (num < 1 || num > session.currentChunk.length) return reply("✦ ━━━━━━━━━━━━━ ✦\n❌ *අවලංගු අංකයකි*\n✦ ━━━━━━━━━━━━━ ✦");
        
        clearTimeout(session.timer);
        let selectedEp = session.currentChunk[num - 1];
        let client = session.client;
        
        // පද්ධතියේ ආරක්ෂාවට Session එක ඉවත් කිරීම
        delete userAnimeSessions[from]; 
        
        await downloadAndSendAnime(hansaka, from, selectedEp, client, mek);
    }
});

module.exports = { };

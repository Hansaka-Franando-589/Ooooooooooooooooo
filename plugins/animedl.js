const { cmd } = require('../command');
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require('fs');
const path = require('path');
const config = require('../config');

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
    if (!bytes || bytes === 0) return '0 B';
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
async function downloadAndSendAnime(hansaka, from, selectedEp, client, mek) {
    let progMsg = await hansaka.sendMessage(from, { text: "✦ ━━━━━━━━━━━━━━ ✦\n📶 *Connecting to Datacenter...*\n✦ ━━━━━━━━━━━━━━ ✦\n\nඕල්යා පද්ධතිය ගොනුව බාගත කිරීම සඳහා සූදානම් වෙමින් පවතී..." }, { quoted: mek });
    const eKey = progMsg.key;
    
    let tempFilePath;
    try {
        // Fetch the specific message using the ID we saved (Client is already connected)
        const msgs = await client.getMessages(TARGET_CHANNEL, { ids: [selectedEp.msgId] });
        if (!msgs || msgs.length === 0 || !msgs[0]) {
            await client.disconnect();
            return hansaka.sendMessage(from, { text: "⚠️ දෝෂයකි: ගොනුව සොයාගත නොහැක.", edit: eKey });
        }
        const episodeMsgObj = msgs[0];

        let cleanName = selectedEp.name.replace(/\.[^/.]+$/, "");
        let newFileName = `${cleanName} - By OLYA${selectedEp.ext}`;
        
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        tempFilePath = path.join(tempDir, newFileName.replace(/[^a-zA-Z0-9.\-_ ]/g, ""));

        const FINAL_CAPTION = `✧ ━━ 𝓞𝓛𝓨𝓐 𝓐𝓝𝓘𝓜𝓔 𝓓𝓞𝓦𝓝𝓛𝓞𝓐𝓓𝓔𝓡 ━━ ✧
   [ 𝗔𝗱𝘃𝗮𝗻𝗰𝗲𝗱 𝗔𝗜 𝗥𝗲𝘁𝗿𝗶𝗲𝘃𝗮𝗹 𝗦𝘆𝘀𝘁𝗲𝗺 ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━

[⚙️] පද්ධති විශ්ලේෂණය (System Analysis):
───────────────────────────
මෙය ඕල්යා පද්ධතිය හරහා ජනනය කරන ලද පණිවිඩයකි. OOM සීමාවන් බිඳ දමමින් මෙම ගොනුව සාර්ථකව උඩුගත කරන ලදී.

[📁] ගොනු තොරතුරු (File Specifications):
───────────────────────────
🎬 ගොනු නාමය : ${cleanName}
💾 ගොනු ධාරිතාව : ${formatSize(selectedEp.size)}
✅ තත්ත්වය : 100% ආරක්ෂිතයි (Secured & Verified)

✦ ━━━━━━━━━━━━━━━━━━━━━━━━━ ✦
  📡 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇 𝒮𝓎𝓈𝓉𝑒𝓂
  👨‍💻 𝒢𝑒𝓃𝑒𝓇𝒶𝓉𝑒𝒹 𝐵𝓎 𝐻𝒶𝓃𝓈𝒶𝓀𝒶 𝒫. 𝐹𝑒𝓇𝓃𝒶𝓃𝒹𝑜`;

        let thumbData = null;
        if (config.ANIME_IMG && fs.existsSync(config.ANIME_IMG)) {
            thumbData = fs.readFileSync(config.ANIME_IMG);
        }

        const fileWriter = fs.createWriteStream(tempFilePath);
        const tgGenerator = client.iterDownload({
            file: episodeMsgObj.media,
            requestSize: 1024 * 1024 // 1MB chunks
        });

        let totalDownloaded = 0;
        let totalSize = selectedEp.size || 1;
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

Memory බාධාවකින් තොරව ඔබගේ ගොනුව ලබා ගනිමින් පවතී...
${barStr} ${pct}%

⚡ වේගය: ${speedStr}

> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;
                    await hansaka.sendMessage(from, { text: txt, edit: eKey }).catch(()=>{});
                }
            }
        }
        
        fileWriter.end();
        await new Promise((resolve) => fileWriter.once('finish', resolve));

        await hansaka.sendMessage(from, { text: "✦ ━━━━━━━━━━━━ ✦\n✅ ගොනුව සාර්ථකව තැටියට ලියවා ඇත. උඩුගත කිරීම (Upload) ආරම්භ වේ...\n✦ ━━━━━━━━━━━━ ✦", edit: eKey }).catch(()=>{});

        let sendObj = {
            document: { url: tempFilePath },
            mimetype: selectedEp.ext.includes('mkv') ? 'video/x-matroska' : 'video/mp4',
            fileName: newFileName,
            caption: FINAL_CAPTION
        };

        if(thumbData) {
            sendObj.contextInfo = {
                externalAdReply: {
                    title: cleanName,
                    body: "Powered by OLYA Server",
                    mediaType: 1,
                    thumbnail: thumbData
                }
            };
        }

        await hansaka.sendMessage(from, sendObj, { quoted: mek });
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        
        // Disconnect safely ONLY after everything is fully done
        await client.disconnect();
        try { await hansaka.sendMessage(from, { delete: eKey }); } catch(err){}

    } catch(err) {
        console.error("Download Error:", err);
        if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (client) await client.disconnect();
        hansaka.sendMessage(from, { text: `⚠️ දෝෂයකි: ${err.message}`, edit: eKey }).catch(()=>{});
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
    if (!q) return reply("❗ *කරුණාකර ඔබට අවශ්‍ය ඇනිමෙ (Anime) එකෙහි නම ලබා දෙන්න...*");
    
    if (userAnimeSessions[from]) {
        if(userAnimeSessions[from].client) await userAnimeSessions[from].client.disconnect().catch(()=>{});
        clearTimeout(userAnimeSessions[from].timer);
    }

    let uName = m.pushName || "පරිශීලක";
    let loadTxt = `✦ ━━━━━━━━━━━━━━━ ✦
     *⚙️ System Analysis*
✦ ━━━━━━━━━━━━━━━ ✦

👤 *පරිශීලක:* ${uName}
🔍 *සෙවුම් පරාමිතිය:* '${q}'

ඕල්යා මූලික දත්ත ගබඩාව සමඟ සම්බන්ධ වෙමින් පවතී... ⚙️`;

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
            return hansaka.sendMessage(from, { text: "⚠️ ගැලපෙන ප්‍රතිඵල හමු නොවිණි.", edit: loadingMsg.key });
        }

        let episodes = [];
        messages.forEach(msg => {
            if (msg.document && msg.document.attributes) {
                const fAttr = msg.document.attributes.find(a => a.className === "DocumentAttributeFilename");
                if (fAttr) {
                    episodes.push({ 
                        msgId: msg.id, 
                        name: fAttr.fileName, 
                        size: msg.document.size || 0, 
                        ext: '.' + fAttr.fileName.split('.').pop()
                    });
                }
            }
        });

        if (episodes.length === 0) {
            await client.disconnect();
            return hansaka.sendMessage(from, { text: "⚠️ වලංගු වීඩියෝ ගොනු කිසිවක් හමු නොවීය.", edit: loadingMsg.key });
        }

        let groups = {};
        episodes.forEach(ep => {
            let sName = getSeriesName(ep.name);
            if (!groups[sName]) groups[sName] = [];
            groups[sName].push(ep);
        });

        let seriesNames = Object.keys(groups);

        // We save the 'client' in the session to keep it alive and prevent TIMEOUT crashes
        userAnimeSessions[from] = {
            step: 1,
            groups,
            seriesNames,
            client, 
            loadingKey: loadingMsg.key,
            timer: setTimeout(async () => { 
                if(userAnimeSessions[from] && userAnimeSessions[from].client) {
                    await userAnimeSessions[from].client.disconnect().catch(()=>{});
                }
                delete userAnimeSessions[from]; 
            }, 5 * 60 * 1000)
        };

        if (seriesNames.length === 1) {
             let singleName = seriesNames[0];
             userAnimeSessions[from].selectedSeries = singleName;
             userAnimeSessions[from].episodes = groups[singleName].sort((a,b) => a.name.localeCompare(b.name));
             userAnimeSessions[from].step = 2; 
             await hansaka.sendMessage(from, { text: "✅ මාලාව හඳුනාගන්නා ලදී...", edit: loadingMsg.key });
             return await sendChunkSelection(hansaka, from, userAnimeSessions[from], mek);
        }

        let listText = `✦ ━━━━━━━━━━━━━━━ ✦
      *📊 Query Results*
✦ ━━━━━━━━━━━━━━━ ✦

අදාළ කතාමාලාවේ *අංකය* (Index Number) Reply කරන්න. 👇\n\n`;
        seriesNames.forEach((name, idx) => {
            listText += `*${idx + 1}️⃣* ${name}\n`;
        });
        
        listText += `\n> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;
        await hansaka.sendMessage(from, { text: listText, edit: loadingMsg.key });
        
    } catch(e) {
        console.error("Anime Search Error:", e);
        if (client) await client.disconnect().catch(()=>{});
        hansaka.sendMessage(from, { text: `⚠️ පද්ධති දෝෂයකි: ${e.message}`, edit: loadingMsg?.key });
    }
});

// =============================================
// SUB-HANDLER FOR ANIMEDL SESSION (THE BULLETPROOF EXTRACTOR)
// =============================================
cmd({
    on: "body" // Global listener to catch ANY text format (Quotes, forwards, raw text)
}, async (hansaka, mek, m, { from, body }) => {
    
    // Check if a session exists for this user
    const session = userAnimeSessions[from];
    if (!session) return;

    // The Bulletproof Text Extractor: Pulls text from anywhere in the message object
    let userText = body || m.text || m.body || (mek.message?.conversation) || (mek.message?.extendedTextMessage?.text) || "";
    if (!userText) return;

    // Pull out the last number from the text
    let numMatches = userText.match(/\d+/g);
    if (!numMatches) return;
    let num = parseInt(numMatches[numMatches.length - 1]);
    if (isNaN(num)) return;

    if (session.step === 1) {
        if (num < 1 || num > session.seriesNames.length) return;
        
        clearTimeout(session.timer);
        session.timer = setTimeout(async () => { 
            if(session.client) await session.client.disconnect().catch(()=>{});
            delete userAnimeSessions[from]; 
        }, 5 * 60 * 1000);

        let selectedName = session.seriesNames[num - 1];
        session.selectedSeries = selectedName;
        session.episodes = session.groups[selectedName].sort((a, b) => a.name.localeCompare(b.name));
        session.step = 2;

        await sendChunkSelection(hansaka, from, session, mek);
        return;
    }

    if (session.step === 2) {
        let maxChunks = Math.ceil(session.episodes.length / 10);
        if (num < 1 || num > maxChunks) return;

        clearTimeout(session.timer);
        session.timer = setTimeout(async () => { 
            if(session.client) await session.client.disconnect().catch(()=>{});
            delete userAnimeSessions[from]; 
        }, 5 * 60 * 1000);

        let start = (num - 1) * 10;
        let pagedEpisodes = session.episodes.slice(start, start + 10);
        session.currentChunk = pagedEpisodes;
        session.step = 3;

        let listText = `✦ ━━━━━━━━━━━━━━━ ✦
   *📥 Episode Selection*
✦ ━━━━━━━━━━━━━━━ ✦

ඔබට අවශ්‍ය කොටසේ අංකය (Index Number) Reply කරන්න. 👇\n\n`;

        pagedEpisodes.forEach((ep, idx) => {
            listText += `*${idx + 1}️⃣* ${ep.name} (${formatSize(ep.size)})\n`;
        });
        
        listText += `\n> 🧚‍♀️ 𝒫𝑜𝓌𝑒𝓇𝑒𝒹 𝐵𝓎 𝒪𝐿𝒴𝒜 𝒮𝑒𝓇𝓋𝑒𝓇`;
        await hansaka.sendMessage(from, { text: listText }, { quoted: mek });
        return;
    }
    
    if (session.step === 3) {
        if (num < 1 || num > session.currentChunk.length) return;
        
        clearTimeout(session.timer);
        let selectedEp = session.currentChunk[num - 1];
        let persistentClient = session.client;
        
        // පද්ධතියේ ආරක්ෂාවට Session එක ඉවත් කිරීම
        delete userAnimeSessions[from]; 
        
        // ඩවුන්ලෝඩ් එක පටන් ගැනීම
        await downloadAndSendAnime(hansaka, from, selectedEp, persistentClient, mek);
    }
});

module.exports = { };

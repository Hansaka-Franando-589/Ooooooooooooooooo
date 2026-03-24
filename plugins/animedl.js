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
const TARGET_CHANNEL = "@animehub6"; // <--- මේක ඔයාගේ චැනල් එකේ නමට වෙනස් කරන්න

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
const userAnimeSessions = {}; // { jid: { step, ... } }

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
    if (!q) return reply("> ❗ *කරුණාකර ඔබට අවශ්‍ය ඇනිමෙ (Anime) එකෙහි නම ලබා දෙන්න...*\n> උදාහරණ: `.anime naruto`");
    
    if (userAnimeSessions[from]) clearTimeout(userAnimeSessions[from].timer);

    let loadTxt = `> ආයුබෝවන්! මම ඕල්යා. ඔයා හොයන '${q}' ඇනිමෙ එක මම දැන් මගේ දත්ත ගබඩාවෙන් හොයමින් පවතිනවා. කරුණාකර තත්පර කිහිපයක් රැඳී සිටින්න... 🔍`;
    let loadingMsg = await hansaka.sendMessage(from, { text: loadTxt }, { quoted: mek });
    
    let client;
    try {
        client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
        await client.connect();

        const messages = await client.getMessages(TARGET_CHANNEL, {
            search: q,
            limit: 150,
            filter: new Api.InputMessagesFilterDocument()
        });

        if (messages.length === 0) {
            await client.disconnect();
            return hansaka.sendMessage(from, { text: "> 😔 සමාවෙන්න, ඒ ඇනිමෙ එක මගේ දත්ත ගබඩාවේ හොයාගන්න බැරි වුණා. වෙනත් නමක් ලබා දී නැවත උත්සාහ කරන්න.", edit: loadingMsg.key });
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
            return hansaka.sendMessage(from, { text: "> 😔 සමාවෙන්න, නිවැරදි වීඩියෝ ගොනු කිසිවක් සොයාගත නොහැකි විය.", edit: loadingMsg.key });
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

        let listText = `> මෙන්න මගේ දත්ත ගබඩාවෙන් හොයාගත්ත '${q}' වලට අදාළ ඇනිමෙ මාලාවන්! ඔයාට බලන්න අවශ්‍ය කතා මාලාවට අදාළ *අංකය* මට Reply කරන්න. 👇\n\n`;
        seriesNames.forEach((name, idx) => {
            listText += `${idx + 1}️⃣ ${name}\n`;
        });
        
        await hansaka.sendMessage(from, { text: listText, edit: loadingMsg.key });
        
    } catch(e) {
        console.error("Anime Search Error:", e);
        if (client) await client.disconnect();
        hansaka.sendMessage(from, { text: "> ⚠️ පද්ධතියේ දෝෂයක් හටගත්තා. කරුණාකර පසුව නැවත උත්සාහ කරන්න.", edit: loadingMsg?.key });
    }
});

// =============================================
// ON BODY SUB-HANDLER FOR ANIMEDL SESSION
// =============================================
cmd({
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (hansaka, mek, m, { from, body, reply }) => {
    const session = userAnimeSessions[from];
    if (!session || !body) return;

    let num = parseInt(body.trim());
    if (isNaN(num)) return; 

    // Step 1: User replies with Series Number
    if (session.step === 1) {
        if (num < 1 || num > session.seriesNames.length) return reply("❌ කරුණාකර නිවැරදි අංකයක් ලබා දෙන්න.");
        
        clearTimeout(session.timer);
        session.timer = setTimeout(() => { delete userAnimeSessions[from]; if(session.client) session.client.disconnect(); }, 5 * 60 * 1000);

        let selectedName = session.seriesNames[num - 1];
        session.selectedSeries = selectedName;
        session.episodes = session.groups[selectedName].sort((a, b) => a.name.localeCompare(b.name));
        session.step = 2;

        await sendChunkSelection(hansaka, from, session, mek);
        return;
    }

    // Step 2: User replies with Chunk Number
    if (session.step === 2) {
        let maxChunks = Math.ceil(session.episodes.length / 10);
        if (num < 1 || num > maxChunks) return reply("❌ කරුණාකර නිවැරදි කාණ්ඩ අංකයක් ලබා දෙන්න.");

        clearTimeout(session.timer);
        session.timer = setTimeout(() => { delete userAnimeSessions[from]; if(session.client) session.client.disconnect(); }, 5 * 60 * 1000);

        let start = (num - 1) * 10;
        let pagedEpisodes = session.episodes.slice(start, start + 10);
        session.currentChunk = pagedEpisodes;
        session.step = 3;

        let listText = `> හරිම ලේසියි නේද! මෙන්න එපිසෝඩ් කාණ්ඩයේ වීඩියෝ ලැයිස්තුව. ඔයාට අවශ්‍යම කරන එපිසෝඩ් එකට අදාල *ඔබට පෙනෙන පිළිවෙළට ඇති අංකය* මට Reply කරන්න. 👇\n\n`;
        pagedEpisodes.forEach((ep, idx) => {
            listText += `${idx + 1}️⃣ ${ep.name.replace(/\.[^/.]+$/, "")} - (${formatSize(ep.size)})\n`;
        });

        await hansaka.sendMessage(from, { react: { text: "🎬", key: mek.key } });
        await hansaka.sendMessage(from, { text: listText }, { quoted: mek });
        return;
    }

    // Step 3: User replies with Episode number within chunk
    if (session.step === 3) {
        if (num < 1 || num > session.currentChunk.length) return reply("❌ කරුණාකර නිවැරදි එපිසෝඩ් අංකයක් ලබා දෙන්න.");

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
    let listText = `> නියමයි! ඔයා තෝරාගත්තේ '${session.selectedSeries}' කතාමාලාවයි! මේකේ එපිසෝඩ් ${epCount} ක් තියෙන නිසා, ඔයාට ලේසියෙන්ම හොයාගන්න පුළුවන් වෙන්න මම කොටස් වලට කැඩුවා. ඔයාට බලන්න ඕන එපිසෝඩ් කාණ්ඩයට අදාළ අංකය මට Reply කරන්න. 👇\n\n`;
    
    let chunkIdx = 1;
    for (let i = 0; i < epCount; i += 10) {
        let end = Math.min(i + 10, epCount);
        listText += `${chunkIdx}️⃣ එපිසෝඩ් ${i + 1} සිට ${end} දක්වා\n`;
        chunkIdx++;
    }

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
    
    let progMsg = await hansaka.sendMessage(from, { text: "🔄 ඕල්යාගේ දත්ත ගබඩාව පැත්තේ පොඩි රවුමක් දාලා ෆයිල් එක හොයනවා... 🏃‍♀️" });
    const eKey = progMsg.key;
    
    const delay = ms => new Promise(res => setTimeout(res, ms));

    await delay(1500);
    await hansaka.sendMessage(from, { text: "🔍 ආ... ඔන්න අදාළ ෆයිල් එක මට හම්බුණා! ඒක සුරක්ෂිතව අරන් එන්නයි හදන්නේ... 📦", edit: eKey });
    
    await delay(1500);
    await hansaka.sendMessage(from, { text: `📥 දත්ත ගබඩාවෙන් වීඩියෝ එක මගේ සර්වර් එකට ගන්න ගමන් ඉන්නේ... ටිකක් ලොකු ෆයිල් එකක් නිසා තත්පරයක් දෙන්න... ⏳ (10%)`, edit: eKey });

    let cleanName = episode.name.replace(/\.[^/.]+$/, "");
    let newFileName = `${cleanName} - By OLYA${episode.ext}`;
    
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const tempFilePath = path.join(tempDir, newFileName);

    let lastProg = Date.now();
    try {
        const buffer = await client.downloadMedia(episode.msgObj, {
            progressCallback: async (downloaded, total) => {
                let now = Date.now();
                if (now - lastProg > 2000) {
                    lastProg = now;
                    let pct = Math.floor((downloaded / total) * 100);
                    if (pct > 10 && pct < 90) {
                        await hansaka.sendMessage(from, { text: `📥 බාගත කරමින් පවතී... ⏳ (${pct}%)`, edit: eKey }).catch(()=>{});
                    }
                }
            }
        });

        fs.writeFileSync(tempFilePath, buffer);
        await hansaka.sendMessage(from, { text: "✅ නියමයි! ෆයිල් එක සර්වර් එකට ආවා. දැන් ලස්සනට පැකේජ් කරලා ඔයාට එවන්නයි හදන්නේ... 🎁", edit: eKey });
        await delay(1000);
        await hansaka.sendMessage(from, { text: "📤 ඔයාගේ WhatsApp එකට වීඩියෝව අප්ලෝඩ් කරමින් පවතී... 📶 මේක ටිකක් වෙලා යයි...", edit: eKey });

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
            if (config.ANIME_IMG && fs.existsSync(config.ANIME_IMG)) {
                thumbData = fs.readFileSync(config.ANIME_IMG);
            }
        } catch(et){}

        let sendObj = {
            document: fs.readFileSync(tempFilePath),
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
        fs.unlinkSync(tempFilePath);
        await client.disconnect();
        
        try { await hansaka.sendMessage(from, { delete: eKey }); } catch(err){}

    } catch(err) {
        console.error("Download Error:", err);
        if (client) await client.disconnect();
        hansaka.sendMessage(from, { text: "> ⚠️ බාගත කිරීමේදී දෝෂයක් හටගත්තා. කරුණාකර පසුව නැවත උත්සාහ කරන්න.", edit: eKey });
    }
}

module.exports = { };

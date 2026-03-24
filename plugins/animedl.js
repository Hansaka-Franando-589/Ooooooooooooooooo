const { cmd } = require('../command');
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { sendInteractiveMessage } = require('gifted-btns'); 

// =============================================
// OLYA DATA CORE CONFIGURATION
// =============================================
const apiId = 36884998;
const apiHash = "c49aa7cecc8079e252f4c49379790700";
const sessionString = "1BQANOTEuMTA4LjU2LjEzMwG7oq1HrH2MdLQ5wZTQljax6swwg7BnveLkiznbkkHyS5TXAOaoi0U5qlUGCVRuSUuTnSIINgSLHCkL4NKEZC1bzb9B7QksWgwXYgl836NfYRsyGCVNhrmx5Zd3/jZZE/Q17NxyIAKwvVfTVoGh0jseQNCTLyhQ/3aRj+RgF/Ogjq/anUpelwJNDP2bIq7yF9GzruEqpA1UnUTAMbIsQFe7GvR9ZhXXfecMSwiW2qjNoJ0CKb10QO4fYqlm3fzvPp5AlrDfSVlQG2MPRpKRoy8rdGGfQ9pUMr8yQ3eGTiepQP3g6+T7pPnLfUpEQOl4bo1ZBFbeIhta0FnY7NyTcV/PsQ=="; 
const stringSession = new StringSession(sessionString);

const TARGET_DATABASE = "@animehub6"; // දත්ත මූලාශ්‍රය

// =============================================
// GLOBAL CACHE & SYSTEM HELPERS
// =============================================
if (!global.olyaAnimeCache) global.olyaAnimeCache = {};
let telegramClient = null; 

const deleteMsg = async (hansaka, jid, key) => {
    try { if (key) await hansaka.sendMessage(jid, { delete: key }); } catch (e) {}
};

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// =============================================
// STEP 1: SMART SEARCH & RANGE BUTTONS
// =============================================
cmd({
    pattern: "anime",
    alias: ["searchanime"],
    desc: "Search anime via Olya Database",
    category: "anime",
    react: "📡"
}, async (hansaka, mek, m, { q, reply, prefix }) => {
    if (!q) {
        return reply(`✦ ━━━━━━━━━━━━━━━━━━━━━━━ ✦
⚠️ *පද්ධති නිවේදනය: ආදාන දත්ත හිස්ව පවතී*

මෙම විධානය ක්‍රියාත්මක කිරීමට නම් ඔබ සෙවීමට බලාපොරොත්තු වන ඇනිමේ චිත්‍රපටයේ හෝ කතා මාලාවේ නම ඇතුළත් කළ යුතුය. කරුණාකර නම නිවැරදිව ටයිප් කර නැවත එවන්න.

👉 *නිවැරදි භාවිතය:* .anime [නම]
✦ ━━━━━━━━━━━━━━━━━━━━━━━ ✦

> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝`);
    }
    
    const jid = m.chat || mek.key.remoteJid;
    let loadingMsg = await hansaka.sendMessage(jid, { text: "🤖 *ඔල්‍යා කෘත්‍රිම බුද්ධි සෙවුම ආරම්භ විය...*\n\nමම දැන් ඔල්‍යාගේ මධ්‍යම දත්ත ගබඩාව පිරික්සමින් සිටිමි. ඔබ ඉල්ලූ තොරතුරු සෙවීම සඳහා මම දැනටමත් දත්ත පද්ධතියට සම්බන්ධ වී අවසන්. කරුණාකර තත්පර කිහිපයක් රැඳී සිටින්න..." });

    try {
        if (!telegramClient) {
            telegramClient = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
            await telegramClient.connect();
        }

        let messages = await telegramClient.getMessages(TARGET_DATABASE, {
            search: q,
            limit: 100, 
            filter: new Api.InputMessagesFilterDocument()
        });

        if (messages.length === 0) {
            await deleteMsg(hansaka, jid, loadingMsg.key);
            return reply(`✦ ━━━━━━━━━━━━━━━━━━━━━━━ ✦
😔 *පද්ධති නිවේදනය: දත්ත හමු නොවුණි*

සමාවෙන්න, "${q}" යන නමට ගැළපෙන කිසිදු වීඩියෝ ගොනුවක් ඔල්‍යාගේ දත්ත ගබඩාව තුළ හමු නොවීය. කරුණාකර ඔබ ලබා දුන් නමෙහි අක්ෂර වින්‍යාසය නිවැරදි දැයි පරීක්ෂා කර නැවත උත්සාහ කරන්න.
✦ ━━━━━━━━━━━━━━━━━━━━━━━ ✦`);
        }

        messages.sort((a, b) => a.id - b.id);
        global.olyaAnimeCache[jid] = messages; 

        let sections = [];
        const chunkSize = 10;
        let rows = [];

        for (let i = 0; i < messages.length; i += chunkSize) {
            const start = i + 1;
            const end = Math.min(i + chunkSize, messages.length);
            rows.push({
                title: `💠 එපිසෝඩ් පරාසය: ${start} - ${end}`,
                description: `මෙම පරාසය තුළ ඇති වීඩියෝ ලැයිස්තුව බැලීම සඳහා මෙතන ඔබන්න.`,
                id: `${prefix}animerange ${i}`
            });
        }

        sections.push({
            title: "🎬 තෝරාගැනීම සඳහා පරාසයන් (Ranges)",
            rows: rows
        });

        await deleteMsg(hansaka, jid, loadingMsg.key);

        await sendInteractiveMessage(hansaka, jid, {
            title: "🦋 𝓞𝓵𝔂𝓪 𝓐𝓷𝓲𝓶𝓮 𝓘𝓷𝓽𝓮𝓵𝓵𝓲𝓰𝓮𝓷𝓬𝓮 🦋\n",
            text: `╭───❮ ✧ ඔල්‍යා දත්ත පද්ධතිය ✧ ❯───\n│ 🤖 *සෙවූ නම:* ${q}\n│ 📊 *හමුවූ වීඩියෝ ගණන:* ${messages.length}\n╰───────────────────────────\n\nමම ඔබ වෙනුවෙන් දත්ත ගබඩාවෙන් ප්‍රතිඵල කිහිපයක් සොයා ගත්තෙමි. ඔබට පහසුවෙන් කියවිය හැකි වන පරිදි මම ඒවා කොටස් වලට වෙන් කර ඇත. \n\n👇 කරුණාකර පහත ඇති *'📂 පරාසය තෝරන්න'* බොත්තම ඔබා ඔබට අවශ්‍ය වීඩියෝව ඇති අංක පරාසය තෝරාගන්න.`,
            footer: `👾 Developed By Hansaka P. Fernando`,
            image: { url: config.ANIME_IMG },
            contextInfo: {
              forwardingScore: 999,
              isForwarded: true,
              externalAdReply: {
                title: `✧ ${q} - Results Extracted ✧`,
                body: `Created By Hansaka P. Fernando`,
                mediaType: 1,
                thumbnailUrl: config.ANIME_IMG,
                sourceUrl: `https://wa.me/${config.OWNER_NUMBER}`,
                renderLargerThumbnail: true
              }
            },
            interactiveButtons: [
              {
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                  title: '📂 පරාසය තෝරන්න',
                  sections: sections
                })
              }
            ]
        }, { quoted: mek });

    } catch (e) {
        console.error("Search Error:", e);
        await deleteMsg(hansaka, jid, loadingMsg.key);
        reply("❌ පද්ධති දෝෂයකි: දත්ත ගබඩාවට සම්බන්ධ වීමට නොහැක. කරුණාකර පසුව උත්සාහ කරන්න.");
    }
});

// =============================================
// STEP 2: RANGE DISPLAY
// =============================================
cmd({
    pattern: "animerange",
    dontAddCommandList: true
}, async (hansaka, mek, m, { q, reply, prefix }) => {
    const jid = m.chat || mek.key.remoteJid;
    const startIndex = parseInt(q);

    if (isNaN(startIndex) || !global.olyaAnimeCache[jid]) {
        return reply("⚠️ පද්ධති කාල ගණනය ඉක්මවා ගොස් ඇත. කරුණාකර නැවත සෙවුමක් (Search) සිදු කරන්න.");
    }

    const messages = global.olyaAnimeCache[jid];
    const chunk = messages.slice(startIndex, startIndex + 10);
    
    let listText = `✦ ━━━━━━━━━━━━━━━━━━━━━━━ ✦
🤖 *ඔල්‍යා එපිසෝඩ් ලැයිස්තුව*
✦ ━━━━━━━━━━━━━━━━━━━━━━━ ✦

ඔබ තෝරාගත් අංක පරාසය තුළ හමු වූ වීඩියෝ ලැයිස්තුව පහත දැක්වේ. මෙහි වීඩියෝවේ නම සහ ගොනුවේ ප්‍රමාණය (File Size) සඳහන් කර ඇත:\n\n`;

    chunk.forEach((msg, i) => {
        const actualIndex = startIndex + i + 1;
        let fileName = `File_${msg.id}.mp4`;
        let fileSize = "Unknown";
        
        if (msg.document && msg.document.attributes) {
            const fileNameAttr = msg.document.attributes.find(a => a.className === "DocumentAttributeFilename");
            if (fileNameAttr) fileName = fileNameAttr.fileName;
            fileSize = formatBytes(msg.document.size);
        }

        listText += `*[ ${actualIndex} ]* 📄 ${fileName}\n📏 *ප්‍රමාණය:* ${fileSize}\n\n`;
    });

    listText += `👇 *බාගත කිරීම ආරම්භ කිරීමට අවශ්‍ය වීඩියෝවේ අංකය පහත අයුරින් එවන්න:*
👉 උදාහරණය: *${prefix}dlanime ${startIndex + 1}*`;

    await hansaka.sendMessage(jid, { 
        text: listText,
        contextInfo: {
            externalAdReply: {
                title: "✧ Select Your Episode ✧",
                body: "Powered By Hansaka P. Fernando",
                thumbnailUrl: config.ANIME_IMG,
                mediaType: 1
            }
        }
    }, { quoted: mek });
});

// =============================================
// STEP 3: DOWNLOAD & ENHANCED 10-STEP UPDATES
// =============================================
cmd({
    pattern: "dlanime",
    alias: ["getanime"],
    desc: "Download process from Olya DB",
    category: "anime",
    react: "📥"
}, async (hansaka, mek, m, { q, reply }) => {
    const jid = m.chat || mek.key.remoteJid;
    const num = parseInt(q) - 1; 

    if (isNaN(num) || !global.olyaAnimeCache[jid] || !global.olyaAnimeCache[jid][num]) {
        return reply("⚠️ වැරදි අංකනයකි. කරුණාකර ලැයිස්තුවෙන් නිවැරදි අංකයක් තෝරා එවන්න.");
    }

    const msg = global.olyaAnimeCache[jid][num];
    let loadingMsg = await hansaka.sendMessage(jid, { text: "⏳ *ඔල්‍යා පද්ධති සැකසුම් ක්‍රියාත්මක වේ...*\n\nඔබ තෝරාගත් වීඩියෝ ගොනුව ලබා ගැනීම සඳහා මම දැන් සූදානම් වෙමින් සිටිමි. කරුණාකර මෙම ක්‍රියාවලිය අවසන් වන තෙක් රැඳී සිටින්න..." });
    let tempFilePath;

    const progressTexts = [
        "🤖 [පියවර 01]: ඔල්‍යාගේ මධ්‍යම දත්ත ගබඩාවට පිවිසෙමින් පවතී... ⚙️",
        "📡 [පියවර 02]: අදාළ වීඩියෝ ගොනුවේ පිහිටීම හඳුනාගනිමින් පවතී... 📂",
        "🎯 [පියවර 03]: වීඩියෝව තහවුරු කරගන්නා ලදී. දැන් බාගත කිරීමට සූදානම්... ✅",
        "🟢 [පියවර 04]: දත්ත සන්නිවේදනය ආරම්භ විය. (10% සම්පූර්ණයි)... ⏳",
        "🟡 [පියවර 05]: වීඩියෝවේ මුල් දත්ත කොටස් සාර්ථකව ලබාගනිමින් පවතී... ⏳",
        "🟠 [පියවර 06]: බාගත කිරීමේ ක්‍රියාවලිය අඩක් නිම කර ඇත. (60%)... ⏳",
        "🔴 [පියවර 07]: බාගත කිරීමේ අවසන් අදියර ක්‍රියාත්මක වේ... ⏳",
        "🔄 [පියවර 08]: බාගත කිරීම සාර්ථකයි. දැන් WhatsApp ජාලයට යොමු කරමින් පවතී... 🚀",
        "📤 [පියවර 09]: වීඩියෝව ඔබ වෙත එවීම සඳහා සූදානම් කරමින් පවතී... 🚀",
        "✨ [පියවර 10]: අවසන් පිරික්සුම් සිදු කරමින් පවතී. දැන් ඔබට වීඩියෝව ලැබෙනු ඇත... 🦋"
    ];

    let progressIndex = 0;
    const progressInterval = setInterval(async () => {
        if (progressIndex < progressTexts.length) {
            await hansaka.sendMessage(jid, { text: progressTexts[progressIndex], edit: loadingMsg.key });
            progressIndex++;
        }
    }, 4000); 

    try {
        let originalName = "Anime_Video";
        let extension = ".mp4";
        let fileSizeRaw = 0;
        
        if (msg.document && msg.document.attributes) {
            fileSizeRaw = msg.document.size;
            const fileNameAttr = msg.document.attributes.find(a => a.className === "DocumentAttributeFilename");
            if (fileNameAttr) {
                const parts = fileNameAttr.fileName.split('.');
                extension = '.' + parts.pop();
                originalName = parts.join('.');
            }
        }

        const newFileName = `${originalName}-BY OLYA${extension}`;
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        tempFilePath = path.join(tempDir, newFileName);

        const buffer = await telegramClient.downloadMedia(msg, {});
        fs.writeFileSync(tempFilePath, buffer);

        clearInterval(progressInterval);
        await hansaka.sendMessage(jid, { text: progressTexts[9], edit: loadingMsg.key });

        const grandCaption = `╔══════════════════════════════════╗
║   🎬 𝓞𝓛𝓨𝓐 𝓟𝓡𝓔𝓜𝓘𝓤𝓜 𝓓𝓞𝓦𝓝𝓛𝓞𝓐𝓓𝓔𝓡 🎬
╠══════════════════════════════════╝
║
║  🤖 *වීඩියෝව සාර්ථකව සපයා අවසන්!*
║  මෙම ගොනුව ඔබ වෙත එවීමට පෙර ඔල්‍යා විසින් 
║  සම්පූර්ණ පරීක්ෂාවකට ලක් කරන ලදී. 
║
╟─ 🏷️ *නම:* ${newFileName}
╟─ 💾 *ප්‍රමාණය:* ${formatBytes(fileSizeRaw)}
╟─ 🎞️ *තත්ත්වය:* Original (Uncompressed)
╟─ 🛡️ *මූලාශ්‍රය:* ඔල්‍යාගේ දත්ත ගබඩාව
╟─ ⚡ *සැකසුම:* Olya Direct Stream Engine
║
╠══════════════════════════════════╗
║  💡 *විශේෂ සටහන:*  
║   මෙම වීඩියෝව කිසිදු "Forwarded" සලකුණක් නොමැතිව ඔල්‍යා විසින් සෘජුවම සකස් කරන ලදී.
║
╠═══════════════════════════════════════╗
║ 💬 "𝓔𝓷𝓳𝓸𝔂 𝓽𝓱𝓮 𝓤𝓵𝓽𝓲𝓶𝓪𝓽𝓮 𝓔𝔁𝓹𝓮𝓻𝓲𝓮𝓷𝓬𝓮"     
╠═══════════════════════════════════════╝
║
║  👑 *නිර්මාණය:* 𝐇𝐚𝐧𝐬𝐚𝐤𝐚 𝐏. 𝐅𝐞𝐫𝐧𝐚𝐧𝐝𝐨
║  💖 *බලය ගැන්වීම:* 𝑨𝒔𝒔𝒊𝒔𝒕𝒂𝒏𝒕 𝑶𝒍𝒚𝒂 💞🐝
║
╚══════════════════════════════════╝



> OLYA V3 © 2026 Olya Development Team.`;

        await hansaka.sendMessage(jid, { 
            document: fs.readFileSync(tempFilePath), 
            mimetype: extension.includes('mkv') ? 'video/x-matroska' : 'video/mp4',
            fileName: newFileName,
            caption: grandCaption,
            contextInfo: {
                externalAdReply: {
                    title: `🎬 ${originalName} - Ready`,
                    body: "Direct Download Completed by Olya",
                    thumbnailUrl: config.ANIME_IMG,
                    mediaType: 1
                }
            }
        });

        fs.unlinkSync(tempFilePath);
        await deleteMsg(hansaka, jid, loadingMsg.key);

    } catch (e) {
        clearInterval(progressInterval);
        console.error("Download Error:", e);
        if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        await hansaka.sendMessage(jid, { text: "❌ *පද්ධති දෝෂයකි:* මෙම වීඩියෝව බාගත කිරීම අසාර්ථක විය. සමහරවිට ගොනුවේ ප්‍රමාණය WhatsApp සීමාවන්ට වඩා වැඩි විය හැක.", edit: loadingMsg.key });
    }
});

module.exports = { };

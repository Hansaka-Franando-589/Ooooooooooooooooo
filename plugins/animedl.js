const { cmd } = require('../command');
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require('fs');
const path = require('path');

// =============================================
// TELEGRAM API CONFIGURATION
// =============================================
const apiId = 36884998;
const apiHash = "c49aa7cecc8079e252f4c49379790700";
// ඔයාගේ Terminal එකේ ආපු දිග Session String එක මෙතන දාන්න
const sessionString = "1BQANOTEuMTA4LjU2LjEzMwG7oq1HrH2MdLQ5wZTQljax6swwg7BnveLkiznbkkHyS5TXAOaoi0U5qlUGCVRuSUuTnSIINgSLHCkL4NKEZC1bzb9B7QksWgwXYgl836NfYRsyGCVNhrmx5Zd3/jZZE/Q17NxyIAKwvVfTVoGh0jseQNCTLyhQ/3aRj+RgF/Ogjq/anUpelwJNDP2bIq7yF9GzruEqpA1UnUTAMbIsQFe7GvR9ZhXXfecMSwiW2qjNoJ0CKb10QO4fYqlm3fzvPp5AlrDfSVlQG2MPRpKRoy8rdGGfQ9pUMr8yQ3eGTiepQP3g6+T7pPnLfUpEQOl4bo1ZBFbeIhta0FnY7NyTcV/PsQ=="; 
const stringSession = new StringSession(sessionString);

// Anime සෙවුම් කරන ප්‍රධාන Telegram චැනල් එකේ Username එක (උදා: @animelibrary)
const TARGET_CHANNEL = "@animehub6"; // <--- මේක ඔයාගේ චැනල් එකේ නමට වෙනස් කරන්න

// =============================================
// GLOBAL DESIGNS
// =============================================
const FOOTER_TEXT = "𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝";
const formatMsg = (title, body) =>
    `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n\n> ${FOOTER_TEXT}`;

const deleteMsg = async (hansaka, jid, key) => {
    try { if (key) await hansaka.sendMessage(jid, { delete: key }); } catch (e) {}
};

// =============================================
// TELEGRAM TO WHATSAPP COMMAND
// =============================================
cmd({
    pattern: "anime",
    alias: ["getanime", "downloadanime"],
    desc: "Search and download anime directly from Telegram",
    category: "anime",
    react: "🎬"
}, async (hansaka, mek, m, { q, reply }) => {
    if (!q) return reply(formatMsg("Missing Input", "Please provide an anime name!\nExample: .anime Naruto Ep 1"));
    
    const jid = m.chat || mek.key.remoteJid;
    let loadingMsg;
    let client;

    try {
        loadingMsg = await hansaka.sendMessage(jid, { text: "Telegram දත්ත ගබඩාව පිරික්සමින් පවතී... 🕵️‍♂️" });

        // Telegram එකට සම්බන්ධ වීම
        client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
        await client.connect();

        // චැනල් එක ඇතුළේ Search කිරීම
        const messages = await client.getMessages(TARGET_CHANNEL, {
            search: q,
            limit: 1, // පළවෙනිම ප්‍රතිඵලය ගන්නවා
            filter: new Api.InputMessagesFilterDocument() // Videos/Documents පමණක් තෝරයි
        });

        if (messages.length === 0) {
            await deleteMsg(hansaka, jid, loadingMsg.key);
            if (client) await client.disconnect();
            return reply(formatMsg("Not Found", "සමාවෙන්න, ඒ Anime එක Telegram චැනල් එකේ හොයාගන්න බැරි වුණා. 😔"));
        }

        const msg = messages[0];
        await hansaka.sendMessage(jid, { text: "Anime එක හම්බුණා! Server එකට Download වෙමින් පවතී... ⏳", edit: loadingMsg.key });

        // ඔරිජිනල් ෆයිල් නම ලබා ගැනීම
        let originalName = "Anime_Video";
        let extension = ".mp4";
        
        if (msg.document && msg.document.attributes) {
            const fileNameAttr = msg.document.attributes.find(a => a.className === "DocumentAttributeFilename");
            if (fileNameAttr) {
                const parts = fileNameAttr.fileName.split('.');
                extension = '.' + parts.pop(); // Extension එක ගන්නවා
                originalName = parts.join('.'); // නම විතරක් ගන්නවා
            }
        }

        // ඔයා ඉල්ලපු විදිහට අලුත් නම හැදීම: {ඔර්ජිනල්නම}-BY OLYA.ext
        const newFileName = `${originalName}-BY OLYA${extension}`;
        
        // Temp folder එකට සූදානම් වීම
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const tempFilePath = path.join(tempDir, newFileName);

        // Telegram එකෙන් Media එක Download කිරීම (මෙතනදී කිසිම Forwarded tag එකක් එන්නේ නෑ)
        const buffer = await client.downloadMedia(msg, {});
        fs.writeFileSync(tempFilePath, buffer);

        await hansaka.sendMessage(jid, { text: "WhatsApp එකට Upload කරමින් පවතී... 🚀", edit: loadingMsg.key });

        // WhatsApp එකට අලුත් ෆයිල් එකක් විදිහට යැවීම
        await hansaka.sendMessage(jid, { 
            document: fs.readFileSync(tempFilePath), 
            mimetype: extension.includes('mkv') ? 'video/x-matroska' : 'video/mp4',
            fileName: newFileName,
            caption: formatMsg("Download Complete", `🎬 Name: ${originalName}\n📥 Downloaded via Telegram`) 
        });

        // Temp file එක මකා දැමීම සහ Telegram Session එක Close කිරීම
        fs.unlinkSync(tempFilePath);
        await deleteMsg(hansaka, jid, loadingMsg.key);
        if (client) await client.disconnect();

    } catch (e) {
        console.error("Telegram Command Error:", e);
        if (client) await client.disconnect();
        await deleteMsg(hansaka, jid, loadingMsg?.key);
        reply(formatMsg("System Error", "Error එකක් ආවා! කේතය හරිද කියලා බලන්න."));
    }
});

module.exports = { };

const { cmd } = require('../command');
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require('fs');
const path = require('path');
const https = require('https');

// =============================================
// TELEGRAM API CONFIGURATION
// =============================================
const apiId = 36884998;
const apiHash = "c49aa7cecc8079e252f4c49379790700";
const sessionString = "1BQANOTEuMTA4LjU2LjEzMwG7oq1HrH2MdLQ5wZTQljax6swwg7BnveLkiznbkkHyS5TXAOaoi0U5qlUGCVRuSUuTnSIINgSLHCkL4NKEZC1bzb9B7QksWgwXYgl836NfYRsyGCVNhrmx5Zd3/jZZE/Q17NxyIAKwvVfTVoGh0jseQNCTLyhQ/3aRj+RgF/Ogjq/anUpelwJNDP2bIq7yF9GzruEqpA1UnUTAMbIsQFe7GvR9ZhXXfecMSwiW2qjNoJ0CKb10QO4fYqlm3fzvPp5AlrDfSVlQG2MPRpKRoy8rdGGfQ9pUMr8yQ3eGTiepQP3g6+T7pPnLfUpEQOl4bo1ZBFbeIhta0FnY7NyTcV/PsQ==";
const stringSession = new StringSession(sessionString);
const TARGET_CHANNEL = "@animehub6";

// =============================================
// GLOBAL DESIGNS
// =============================================
const FOOTER_TEXT = "𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝";
const formatMsg = (title, body) =>
    `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n\n> ${FOOTER_TEXT}`;

const deleteMsg = async (hansaka, jid, key) => {
    try { if (key) await hansaka.sendMessage(jid, { delete: key }); } catch (e) { }
};

// =============================================
// ANIME STATE STORE (per user)
// =============================================
// Structure: animeState[userJid] = { step, groups, allMessages, selectedGroupMsgs, searchQuery }
const animeState = {};

// =============================================
// POLLINATIONS AI HELPER
// =============================================
function askPollinationsAI(prompt) {
    return new Promise((resolve, reject) => {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `https://text.pollinations.ai/${encodedPrompt}?model=openai&seed=42&json=false`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data.trim()));
        }).on('error', reject);
    });
}

// =============================================
// AI GROUP ANALYZER
// =============================================
async function groupFilesWithAI(fileNames) {
    const prompt = `You are a file analyzer. Given these anime file names, group them logically.
Rules:
- If they are episodes of the same anime, group by episode ranges (e.g., "Episodes 1-50", "Episodes 51-100")
- If there are movies, specials, OVAs, group them separately
- If files are from different anime series, group by series name
- Return ONLY a valid JSON array. No explanation. No markdown.
- Format: [{"label": "Group Name", "indices": [0,1,2,...]}, ...]

File names (index: name):
${fileNames.map((n, i) => `${i}: ${n}`).join('\n')}`;

    try {
        const response = await askPollinationsAI(prompt);
        // JSON extract
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (e) {
        return null;
    }
}

// =============================================
// FORMAT HELPERS
// =============================================
function buildGroupListText(groups, query) {
    let text = `🔍 *"${query}"* සෙවීමෙන් ප්‍රතිඵල ලැබුණා!\n\n`;
    groups.forEach((g, i) => {
        text += `${i + 1}. 📂 ${g.label} *(${g.indices.length} files)*\n`;
    });
    text += `\n💬 *ඔයාට ඕනේ category එකේ number එක reply කරන්න*`;
    return formatMsg("🎬 Anime Search Results", text);
}

function buildSubListText(msgs, groupLabel) {
    let text = `📂 *${groupLabel}*\n\n`;
    msgs.forEach((msg, i) => {
        const name = getFileName(msg);
        text += `${i + 1}. 🎬 ${name}\n`;
    });
    text += `\n💬 *ඔයාට ඕනේ file එකේ number එක reply කරන්න*\n`;
    text += `_(0 ගැහුවොත් ආපහු category list එකට යනවා)_`;
    return formatMsg("📋 File List", text);
}

function getFileName(msg) {
    if (msg.document && msg.document.attributes) {
        const attr = msg.document.attributes.find(a => a.className === "DocumentAttributeFilename");
        if (attr) return attr.fileName;
    }
    return msg.message || `File_${msg.id}`;
}

// =============================================
// MAIN ANIME COMMAND
// =============================================
cmd({
    pattern: "anime",
    alias: ["getanime", "downloadanime"],
    desc: "Search and download anime directly from Telegram",
    category: "anime",
    react: "🎬"
}, async (hansaka, mek, m, { q, reply }) => {
    if (!q) return reply(formatMsg("Missing Input", "Please provide an anime name!\nExample: .anime Naruto"));

    const jid = m.chat || mek.key.remoteJid;
    let loadingMsg;
    let client;

    try {
        loadingMsg = await hansaka.sendMessage(jid, { text: "Telegram දත්ත ගබඩාව පිරික්සමින් පවතී... 🕵️‍♂️" });

        // Telegram Connect
        client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
        await client.connect();

        // Search Telegram - get up to 50 results
        const messages = await client.getMessages(TARGET_CHANNEL, {
            search: q,
            limit: 50,
            filter: new Api.InputMessagesFilterDocument()
        });

        await client.disconnect();

        if (!messages || messages.length === 0) {
            await deleteMsg(hansaka, jid, loadingMsg.key);
            return reply(formatMsg("Not Found", `සමාවෙන්න, *"${q}"* Telegram චැනල් එකේ හොයාගන්න බැරි වුණා. 😔`));
        }

        await hansaka.sendMessage(jid, { text: `${messages.length} ගොනු ලැබුණා! AI ලෙස සකසමින්... 🤖`, edit: loadingMsg.key });

        // Get file names for AI
        const fileNames = messages.map(msg => getFileName(msg));

        // AI Grouping
        let groups = await groupFilesWithAI(fileNames);

        // Fallback: if AI fails, make one group "All Results"
        if (!groups || groups.length === 0) {
            groups = [{ label: `All Results (${messages.length})`, indices: messages.map((_, i) => i) }];
        }

        // Save state
        const senderJid = m.sender || mek.key.participant || jid;
        animeState[senderJid] = {
            step: "group_select",
            groups,
            allMessages: messages,
            searchQuery: q,
            jid,
            loadingKey: loadingMsg.key
        };

        await deleteMsg(hansaka, jid, loadingMsg.key);

        // Send group list
        const listText = buildGroupListText(groups, q);
        await hansaka.sendMessage(jid, { text: listText }, { quoted: mek });

    } catch (e) {
        console.error("Anime Command Error:", e);
        if (client) { try { await client.disconnect(); } catch (_) { } }
        await deleteMsg(hansaka, jid, loadingMsg?.key);
        reply(formatMsg("System Error", `Error: ${e.message}`));
    }
});

// =============================================
// REPLY HANDLER - handles number replies
// =============================================
cmd({
    pattern: undefined,
    filter: (m, { sender }) => {
        return animeState[sender] !== undefined;
    }
}, async (hansaka, mek, m, { reply, sender }) => {
    const state = animeState[sender];
    if (!state) return;

    const jid = state.jid || m.chat || mek.key.remoteJid;
    const input = (m.text || "").trim();
    const num = parseInt(input);

    if (isNaN(num)) return; // ignore non-number messages

    // ---- STEP 1: User picked a GROUP ----
    if (state.step === "group_select") {
        if (num < 1 || num > state.groups.length) {
            return reply(formatMsg("Invalid Input", `1 සිට ${state.groups.length} අතර number එකක් ලබා දෙන්න.`));
        }

        const selectedGroup = state.groups[num - 1];
        const groupMsgs = selectedGroup.indices.map(i => state.allMessages[i]);

        // Update state
        state.step = "file_select";
        state.selectedGroupMsgs = groupMsgs;
        state.selectedGroupLabel = selectedGroup.label;

        const subListText = buildSubListText(groupMsgs, selectedGroup.label);
        await hansaka.sendMessage(jid, { text: subListText }, { quoted: mek });
        return;
    }

    // ---- STEP 2: User picked a FILE ----
    if (state.step === "file_select") {
        // 0 = go back
        if (num === 0) {
            state.step = "group_select";
            delete state.selectedGroupMsgs;
            delete state.selectedGroupLabel;
            const listText = buildGroupListText(state.groups, state.searchQuery);
            await hansaka.sendMessage(jid, { text: listText }, { quoted: mek });
            return;
        }

        if (num < 1 || num > state.selectedGroupMsgs.length) {
            return reply(formatMsg("Invalid Input", `1 සිට ${state.selectedGroupMsgs.length} අතර number එකක් ලබා දෙන්න. (0 = ආපහු යන්න)`));
        }

        const selectedMsg = state.selectedGroupMsgs[num - 1];
        const fileName = getFileName(selectedMsg);

        // Remove state so user can start fresh
        delete animeState[sender];

        let loadingMsg;
        let client;
        try {
            loadingMsg = await hansaka.sendMessage(jid, { text: `⏳ *${fileName}* ඩවුන්ලෝඩ් වෙමින් පවතී...` }, { quoted: mek });

            client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
            await client.connect();

            // Get extension
            const parts = fileName.split('.');
            const extension = '.' + parts.pop();
            const originalName = parts.join('.');
            const newFileName = `${originalName}-BY OLYA${extension}`;

            // Download to temp
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const tempFilePath = path.join(tempDir, newFileName);

            await hansaka.sendMessage(jid, { text: "🚀 WhatsApp එකට Upload කරමින් පවතී...", edit: loadingMsg.key });

            const buffer = await client.downloadMedia(selectedMsg, {});
            fs.writeFileSync(tempFilePath, buffer);

            await client.disconnect();

            // Send to WhatsApp
            await hansaka.sendMessage(jid, {
                document: fs.readFileSync(tempFilePath),
                mimetype: extension.includes('mkv') ? 'video/x-matroska' : 'video/mp4',
                fileName: newFileName,
                caption: formatMsg("✅ Download Complete", `🎬 *${originalName}*\n📥 Powered by Olya & Telegram`)
            }, { quoted: mek });

            // Cleanup
            fs.unlinkSync(tempFilePath);
            await deleteMsg(hansaka, jid, loadingMsg.key);

        } catch (e) {
            console.error("Anime Download Error:", e);
            if (client) { try { await client.disconnect(); } catch (_) { } }
            // cleanup temp if exists
            try {
                const tempDir = path.join(__dirname, '../temp');
                const tf = path.join(tempDir, `${fileName}-BY OLYA`);
                if (fs.existsSync(tf)) fs.unlinkSync(tf);
            } catch (_) { }
            await deleteMsg(hansaka, jid, loadingMsg?.key);
            reply(formatMsg("Download Error", `Error: ${e.message}`));
        }
        return;
    }
});

module.exports = {};

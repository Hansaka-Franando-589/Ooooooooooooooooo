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
// step: "group_select" | "file_select"
// groups: [{label, indices}]
// allMessages: Telegram message array
// selectedGroupMsgs: filtered messages for current group
// selectedGroupLabel: name of selected group
// filePage: current page index for sub-list (0-based)
const animeState = {};

const PAGE_SIZE = 15; // show 15 files per page

// =============================================
// POLLINATIONS AI HELPER
// =============================================
function askPollinationsAI(prompt) {
    return new Promise((resolve, reject) => {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `https://text.pollinations.ai/${encodedPrompt}?model=openai&seed=42`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data.trim()));
        }).on('error', reject);
    });
}

// =============================================
// GET FILE NAME FROM TELEGRAM MESSAGE
// =============================================
function getFileName(msg) {
    if (msg.document && msg.document.attributes) {
        const attr = msg.document.attributes.find(a => a.className === "DocumentAttributeFilename");
        if (attr && attr.fileName) return attr.fileName;
    }
    return msg.message || `File_${msg.id}`;
}

// =============================================
// AI GROUP ANALYZER
// =============================================
async function groupFilesWithAI(fileNames) {
    const prompt = `You are an anime file organizer. Analyze these anime file names and group them.

RULES:
1. If files are episodes of the same anime series, group by episode ranges of ~50 each (e.g. "Naruto Episodes 1-50", "Naruto Episodes 51-100"). Do NOT list individual episodes.
2. Files that are NOT episodes (Movies, OVAs, Specials, Trailers) → keep as a separate group with their FULL original file name as the label.
3. If files belong to completely different anime series → group by series name.
4. Keep group labels SHORT and CLEAR.
5. Return ONLY a valid JSON array, no explanation, no markdown, no code fences.
6. Format: [{"label": "Group Label Here", "indices": [0,1,2,3]}, ...]

File list (index: name):
${fileNames.map((n, i) => `${i}: ${n}`).join('\n')}`;

    try {
        const response = await askPollinationsAI(prompt);
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
        return null;
    } catch (e) {
        console.error("AI grouping error:", e.message);
        return null;
    }
}

// =============================================
// FORMAT HELPERS
// =============================================
function buildGroupListText(groups, query, total) {
    let text = `🔍 *"${query}"* සෙවීමෙන් *${total}* ගොනු ලැබුණා!\n\n`;
    groups.forEach((g, i) => {
        text += `${i + 1}. 📂 ${g.label} *(${g.indices.length} files)*\n`;
    });
    text += `\n💬 *Category number reply කරන්න*`;
    return formatMsg("🎬 Anime Search Results", text);
}

function buildSubListText(msgs, groupLabel, page) {
    const start = page * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, msgs.length);
    const pageItems = msgs.slice(start, end);
    const totalPages = Math.ceil(msgs.length / PAGE_SIZE);

    let text = `📂 *${groupLabel}*\n`;
    if (totalPages > 1) text += `_(Page ${page + 1}/${totalPages})_\n`;
    text += `\n`;

    pageItems.forEach((msg, i) => {
        const name = getFileName(msg);
        text += `${start + i + 1}. 🎬 ${name}\n`;
    });

    text += `\n`;
    if (page > 0) text += `⬅️ *p* → කලින් page\n`;
    if (end < msgs.length) text += `➡️ *n* → ඊළඟ page\n`;
    text += `🔙 *0* → category list වෙත`;
    return formatMsg("📋 File List", text);
}

// =============================================
// PAGINATED TELEGRAM SEARCH
// =============================================
async function searchAllMessages(client, query) {
    const allMessages = [];
    let offsetId = 0;
    const batchSize = 100;
    const maxBatches = 5; // max 500 results

    for (let i = 0; i < maxBatches; i++) {
        try {
            const batch = await client.getMessages(TARGET_CHANNEL, {
                search: query,
                limit: batchSize,
                offsetId: offsetId,
                filter: new Api.InputMessagesFilterDocument()
            });

            if (!batch || batch.length === 0) break;
            allMessages.push(...batch);
            offsetId = batch[batch.length - 1].id;
            if (batch.length < batchSize) break; // no more pages
        } catch (e) {
            console.error("Batch fetch error:", e.message);
            break;
        }
    }

    return allMessages;
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
    const senderJid = m.sender || mek.key.participant || jid;
    let loadingMsg;
    let client;

    try {
        loadingMsg = await hansaka.sendMessage(jid, { text: "Telegram දත්ත ගබඩාව සෙවෙමින් ..." });

        client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
        await client.connect();

        await hansaka.sendMessage(jid, { text: `🔍 *"${q}"* සෙවෙමින් පවතී (සියලු pages)...`, edit: loadingMsg.key });

        // Paginated search - up to 500 results
        const messages = await searchAllMessages(client, q);
        await client.disconnect();

        if (!messages || messages.length === 0) {
            await deleteMsg(hansaka, jid, loadingMsg.key);
            return reply(formatMsg("Not Found", `සමාවෙන්න, *"${q}"* Telegram චැනල් එකේ හොයාගන්න බැරි වුණා. 😔`));
        }

        await hansaka.sendMessage(jid, { text: `✅ *${messages.length}* ගොනු ලැබුණා! AI ලෙස සකසමින්... 🤖`, edit: loadingMsg.key });

        const fileNames = messages.map(msg => getFileName(msg));
        let groups = await groupFilesWithAI(fileNames);

        // Fallback if AI fails
        if (!groups || groups.length === 0) {
            groups = [{ label: `All Results`, indices: messages.map((_, i) => i) }];
        }

        // Save state
        animeState[senderJid] = {
            step: "group_select",
            groups,
            allMessages: messages,
            searchQuery: q,
            jid
        };

        await deleteMsg(hansaka, jid, loadingMsg.key);
        const listText = buildGroupListText(groups, q, messages.length);
        await hansaka.sendMessage(jid, { text: listText }, { quoted: mek });

    } catch (e) {
        console.error("Anime Command Error:", e);
        if (client) { try { await client.disconnect(); } catch (_) { } }
        await deleteMsg(hansaka, jid, loadingMsg?.key);
        reply(formatMsg("System Error", `Error: ${e.message}`));
    }
});

// =============================================
// REPLY HANDLER - number/nav replies
// =============================================
cmd({
    pattern: undefined,
    filter: (mek, { sender }) => {
        return animeState[sender] !== undefined;
    }
}, async (hansaka, mek, m, { reply, sender, senderNumber }) => {
    const state = animeState[sender];
    if (!state) return;

    const jid = state.jid || m.chat || mek.key.remoteJid;
    const rawInput = (mek.message?.conversation || mek.message?.extendedTextMessage?.text || "").trim().toLowerCase();

    // ---- STEP 1: GROUP SELECT ----
    if (state.step === "group_select") {
        const num = parseInt(rawInput);
        if (isNaN(num) || num < 1 || num > state.groups.length) {
            return reply(formatMsg("Invalid Input", `1 සිට ${state.groups.length} අතර number reply කරන්න.`));
        }

        const selectedGroup = state.groups[num - 1];
        const groupMsgs = selectedGroup.indices.map(i => state.allMessages[i]);

        state.step = "file_select";
        state.selectedGroupMsgs = groupMsgs;
        state.selectedGroupLabel = selectedGroup.label;
        state.filePage = 0;

        const subListText = buildSubListText(groupMsgs, selectedGroup.label, 0);
        await hansaka.sendMessage(jid, { text: subListText }, { quoted: mek });
        return;
    }

    // ---- STEP 2: FILE SELECT ----
    if (state.step === "file_select") {
        const msgs = state.selectedGroupMsgs;
        const totalPages = Math.ceil(msgs.length / PAGE_SIZE);

        // Navigation: next page
        if (rawInput === 'n') {
            if (state.filePage + 1 >= totalPages) return reply("ඊළඟ page නෑ.");
            state.filePage++;
            return await hansaka.sendMessage(jid, { text: buildSubListText(msgs, state.selectedGroupLabel, state.filePage) }, { quoted: mek });
        }

        // Navigation: previous page
        if (rawInput === 'p') {
            if (state.filePage <= 0) return reply("කලින් page නෑ.");
            state.filePage--;
            return await hansaka.sendMessage(jid, { text: buildSubListText(msgs, state.selectedGroupLabel, state.filePage) }, { quoted: mek });
        }

        // Go back to group list
        if (rawInput === '0') {
            state.step = "group_select";
            delete state.selectedGroupMsgs;
            delete state.selectedGroupLabel;
            delete state.filePage;
            const listText = buildGroupListText(state.groups, state.searchQuery, state.allMessages.length);
            return await hansaka.sendMessage(jid, { text: listText }, { quoted: mek });
        }

        const num = parseInt(rawInput);
        if (isNaN(num) || num < 1 || num > msgs.length) {
            return reply(formatMsg("Invalid Input", `1 සිට ${msgs.length} අතර number reply කරන්න.\n*n* = ඊළඟ page | *p* = කලින් page | *0* = ආපහු`));
        }

        const selectedMsg = msgs[num - 1];
        const fileName = getFileName(selectedMsg);

        // Remove state immediately
        delete animeState[sender];

        let loadingMsg;
        let client;
        try {
            loadingMsg = await hansaka.sendMessage(jid, { text: `⏳ *${fileName}*\nDownload වෙමින් පවතී...` }, { quoted: mek });

            client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
            await client.connect();

            const parts = fileName.split('.');
            const extension = '.' + parts.pop();
            const originalName = parts.join('.');
            const newFileName = `${originalName}-BY OLYA${extension}`;

            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const tempFilePath = path.join(tempDir, newFileName);

            await hansaka.sendMessage(jid, { text: "🚀 WhatsApp එකට Upload කරමින්...", edit: loadingMsg.key });

            const buffer = await client.downloadMedia(selectedMsg, {});
            fs.writeFileSync(tempFilePath, buffer);
            await client.disconnect();

            await hansaka.sendMessage(jid, {
                document: fs.readFileSync(tempFilePath),
                mimetype: extension.includes('mkv') ? 'video/x-matroska' : 'video/mp4',
                fileName: newFileName,
                caption: formatMsg("✅ Download Complete", `🎬 *${originalName}*\n📥 Powered by Olya & Telegram`)
            }, { quoted: mek });

            fs.unlinkSync(tempFilePath);
            await deleteMsg(hansaka, jid, loadingMsg.key);

        } catch (e) {
            console.error("Anime Download Error:", e);
            if (client) { try { await client.disconnect(); } catch (_) { } }
            await deleteMsg(hansaka, jid, loadingMsg?.key);
            reply(formatMsg("Download Error", `Error: ${e.message}`));
        }
        return;
    }
});

module.exports = { animeState };

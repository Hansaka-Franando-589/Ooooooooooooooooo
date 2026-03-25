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
const animeState = {};
const PAGE_SIZE = 15;

// =============================================
// FILE NAME HELPERS
// =============================================
function getRawFileName(msg) {
    if (msg.document && msg.document.attributes) {
        const attr = msg.document.attributes.find(a => a.className === "DocumentAttributeFilename");
        if (attr && attr.fileName) return attr.fileName;
    }
    // Do NOT fall back to msg.message - it can contain copyright content
    return `Anime_File_${msg.id}`;
}

// Sanitize name for WhatsApp display - removes channel tags, @ mentions etc.
function cleanDisplayName(rawName) {
    let name = rawName
        .replace(/@[\w._-]+/g, '')          // remove @channel mentions
        .replace(/\[[^\]]{0,30}\]/g, '')     // remove [tags]
        .replace(/\([^)]{0,30}p\)/g, '')     // remove (720p) (1080p) etc
        .replace(/\s{2,}/g, ' ')             // collapse spaces
        .trim();

    // Remove leading/trailing dots, dashes, underscores
    name = name.replace(/^[._\-\s]+|[._\-\s]+$/g, '').trim();

    // If empty after cleaning, use truncated original
    if (!name) {
        name = rawName.replace(/@[\w._-]+/g, '').trim().substring(0, 50);
    }

    // Limit length
    if (name.length > 60) name = name.substring(0, 57) + '...';

    return name || rawName.substring(0, 50);
}

// =============================================
// SMART LOCAL GROUPING (no AI needed)
// Groups episodes into ranges, keeps others separately
// =============================================
function smartGroup(messages, fileNames) {
    // Episode detection patterns
    const epPattern = /(?:ep(?:isode)?s?|e)[.\s_-]?(\d+)(?!\d)|[.\s_-](\d{2,4})[.\s_-]/i;

    const episodic = [];
    const nonEpisodic = [];

    messages.forEach((msg, i) => {
        const name = fileNames[i];
        const match = name.match(epPattern);
        if (match) {
            const epNum = parseInt(match[1] || match[2]);
            episodic.push({ msg, idx: i, epNum, name });
        } else {
            nonEpisodic.push({ msg, idx: i, name });
        }
    });

    // Sort episodes by number
    episodic.sort((a, b) => a.epNum - b.epNum);

    const groups = [];
    const chunkSize = 50;

    // Create episode range groups
    for (let i = 0; i < episodic.length; i += chunkSize) {
        const chunk = episodic.slice(i, i + chunkSize);
        const epNums = chunk.map(f => f.epNum).filter(n => !isNaN(n)).sort((a, b) => a - b);
        let label;
        if (epNums.length > 1) {
            label = `Episodes ${epNums[0]} - ${epNums[epNums.length - 1]}`;
        } else if (epNums.length === 1) {
            label = `Episode ${epNums[0]}`;
        } else {
            label = `Files ${i + 1} - ${i + chunk.length}`;
        }
        groups.push({ label, indices: chunk.map(f => f.idx) });
    }

    // Non-episodic: movies, OVAs, specials
    if (nonEpisodic.length > 0) {
        if (nonEpisodic.length <= 12) {
            // Show each one separately with clean name
            nonEpisodic.forEach(f => {
                const clean = cleanDisplayName(f.name);
                groups.push({ label: clean, indices: [f.idx] });
            });
        } else {
            groups.push({
                label: `Movies, OVAs & Others (${nonEpisodic.length})`,
                indices: nonEpisodic.map(f => f.idx)
            });
        }
    }

    if (groups.length === 0) {
        groups.push({ label: `All Results (${messages.length})`, indices: messages.map((_, i) => i) });
    }

    return groups;
}

// =============================================
// POLLINATIONS AI - only for small result sets
// =============================================
function askPollinationsAI(prompt) {
    return new Promise((resolve, reject) => {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `https://text.pollinations.ai/${encodedPrompt}?model=openai&seed=42`;
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data.trim()));
        });
        req.on('error', reject);
        req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    });
}

async function groupFilesWithAI(fileNames) {
    const prompt = `Analyze these anime file names and group them logically.
Rules:
- Episodes: group into ranges of ~50 (e.g. "Naruto Episodes 1-50")
- Movies/OVAs/Specials: show FULL clean file name (remove @tags)
- Different series: separate groups
- Return ONLY valid JSON array, no explanation.
- Format: [{"label": "...", "indices": [0,1,2]}, ...]

Files:
${fileNames.map((n, i) => `${i}: ${cleanDisplayName(n)}`).join('\n')}`;

    try {
        const response = await askPollinationsAI(prompt);
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
        return null;
    } catch (e) {
        return null;
    }
}

// =============================================
// FORMAT HELPERS
// =============================================
function buildGroupListText(groups, query, total) {
    let text = `🔍 *"${query}"* - *${total}* ගොනු ලැබුණා!\n\n`;
    groups.forEach((g, i) => {
        const count = g.indices.length;
        const countStr = count > 1 ? ` *(${count})*` : '';
        text += `${i + 1}. 📂 ${g.label}${countStr}\n`;
    });
    text += `\n💬 *Category number reply කරන්න*`;
    return formatMsg("🎬 Anime Search Results", text);
}

function buildSubListText(msgs, fileNames, groupLabel, page) {
    const start = page * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, msgs.length);
    const totalPages = Math.ceil(msgs.length / PAGE_SIZE);

    let text = `📂 *${groupLabel}*\n`;
    if (totalPages > 1) text += `_(Page ${page + 1} / ${totalPages})_\n`;
    text += `\n`;

    for (let i = start; i < end; i++) {
        const clean = cleanDisplayName(fileNames[i]);
        text += `${i + 1}. ${clean}\n`;
    }

    text += `\n`;
    if (page > 0) text += `*p* ← කලින් page\n`;
    if (end < msgs.length) text += `*n* → ඊළඟ page\n`;
    text += `*0* → category list`;
    return formatMsg("📋 File List", text);
}

// =============================================
// PAGINATED TELEGRAM SEARCH
// =============================================
async function searchAllMessages(client, query) {
    const allMessages = [];
    let offsetId = 0;
    const batchSize = 100;
    const maxBatches = 5;

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
            if (batch.length < batchSize) break;
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
    if (!q) return reply(formatMsg("Missing Input", "Anime නම ලබා දෙන්න!\nExample: .anime Naruto"));

    const jid = m.chat || mek.key.remoteJid;
    const senderJid = m.sender || mek.key.participant || jid;
    let loadingMsg;
    let client;

    try {
        loadingMsg = await hansaka.sendMessage(jid, { text: `🔍 "${q}" සොයමින්...` });

        client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
        await client.connect();

        const messages = await searchAllMessages(client, q);
        await client.disconnect();

        if (!messages || messages.length === 0) {
            await deleteMsg(hansaka, jid, loadingMsg.key);
            return reply(formatMsg("Not Found", `"${q}" හොයාගන්න බැරි වුණා. 😔\nෙවනත් keyword එකක් try කරන්න.`));
        }

        await hansaka.sendMessage(jid, {
            text: `✅ *${messages.length}* ගොනු ලැබුණා! Groupings සකසමින්...`,
            edit: loadingMsg.key
        });

        // Get raw file names (never use msg.message - copyright risk)
        const rawFileNames = messages.map(msg => getRawFileName(msg));

        // Smart local grouping (reliable, no API)
        let groups = smartGroup(messages, rawFileNames);

        // If result set is small, optionally try AI for better labels
        if (messages.length <= 50) {
            const aiGroups = await groupFilesWithAI(rawFileNames);
            if (aiGroups && aiGroups.length > 0) groups = aiGroups;
        }

        // Save state
        animeState[senderJid] = {
            step: "group_select",
            groups,
            allMessages: messages,
            rawFileNames,
            searchQuery: q,
            jid
        };

        await deleteMsg(hansaka, jid, loadingMsg.key);
        await hansaka.sendMessage(jid, {
            text: buildGroupListText(groups, q, messages.length)
        }, { quoted: mek });

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
    filter: (mek, { sender }) => animeState[sender] !== undefined
}, async (hansaka, mek, m, { reply, sender, body }) => {
    const state = animeState[sender];
    if (!state) return;

    const jid = state.jid || m.chat || mek.key.remoteJid;
    // Use body from index.js (already extracted & processed)
    const rawInput = (body || "").trim().toLowerCase();

    // ---- STEP 1: GROUP SELECT ----
    if (state.step === "group_select") {
        const num = parseInt(rawInput);
        if (isNaN(num) || num < 1 || num > state.groups.length) {
            return reply(formatMsg("Invalid Input", `1 සිට ${state.groups.length} අතර number reply කරන්න.`));
        }

        const selectedGroup = state.groups[num - 1];
        const groupMsgs = selectedGroup.indices.map(i => state.allMessages[i]);
        const groupNames = selectedGroup.indices.map(i => state.rawFileNames[i]);

        state.step = "file_select";
        state.selectedGroupMsgs = groupMsgs;
        state.selectedGroupNames = groupNames;
        state.selectedGroupLabel = selectedGroup.label;
        state.filePage = 0;

        await hansaka.sendMessage(jid, {
            text: buildSubListText(groupMsgs, groupNames, selectedGroup.label, 0)
        }, { quoted: mek });
        return;
    }

    // ---- STEP 2: FILE SELECT ----
    if (state.step === "file_select") {
        const msgs = state.selectedGroupMsgs;
        const names = state.selectedGroupNames;
        const totalPages = Math.ceil(msgs.length / PAGE_SIZE);

        if (rawInput === 'n') {
            if (state.filePage + 1 >= totalPages) return reply("ඊළඟ page නෑ.");
            state.filePage++;
            return await hansaka.sendMessage(jid, {
                text: buildSubListText(msgs, names, state.selectedGroupLabel, state.filePage)
            }, { quoted: mek });
        }

        if (rawInput === 'p') {
            if (state.filePage <= 0) return reply("කලින් page නෑ.");
            state.filePage--;
            return await hansaka.sendMessage(jid, {
                text: buildSubListText(msgs, names, state.selectedGroupLabel, state.filePage)
            }, { quoted: mek });
        }

        if (rawInput === '0') {
            state.step = "group_select";
            delete state.selectedGroupMsgs;
            delete state.selectedGroupNames;
            delete state.selectedGroupLabel;
            delete state.filePage;
            return await hansaka.sendMessage(jid, {
                text: buildGroupListText(state.groups, state.searchQuery, state.allMessages.length)
            }, { quoted: mek });
        }

        const num = parseInt(rawInput);
        if (isNaN(num) || num < 1 || num > msgs.length) {
            return reply(formatMsg("Invalid Input",
                `1 සිට ${msgs.length} අතර number reply කරන්න.\n*n* = ඊළඟ | *p* = කලින් | *0* = ආපහු`
            ));
        }

        const selectedMsg = msgs[num - 1];
        const rawName = names[num - 1];

        // Clear state before download
        delete animeState[sender];

        let loadingMsg;
        let client;
        try {
            const cleanName = cleanDisplayName(rawName);
            loadingMsg = await hansaka.sendMessage(jid, {
                text: `⏳ Download වෙමින්...\n📄 ${cleanName}`
            }, { quoted: mek });

            client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
            await client.connect();

            const parts = rawName.split('.');
            const ext = '.' + parts.pop();
            const baseName = parts.join('.');
            const newFileName = `${baseName}-BY OLYA${ext}`;

            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const tempFilePath = path.join(tempDir, newFileName);

            await hansaka.sendMessage(jid, { text: "🚀 WhatsApp Upload කරමින්...", edit: loadingMsg.key });

            const buffer = await client.downloadMedia(selectedMsg, {});
            fs.writeFileSync(tempFilePath, buffer);
            await client.disconnect();

            const mimetype = ext.toLowerCase().includes('mkv')
                ? 'video/x-matroska'
                : 'video/mp4';

            await hansaka.sendMessage(jid, {
                document: fs.readFileSync(tempFilePath),
                mimetype,
                fileName: newFileName,
                caption: formatMsg("✅ Download Complete",
                    `🎬 *${cleanName}*\n📥 Olya x Telegram`
                )
            }, { quoted: mek });

            fs.unlinkSync(tempFilePath);
            await deleteMsg(hansaka, jid, loadingMsg.key);

        } catch (e) {
            console.error("Anime Download Error:", e);
            if (client) { try { await client.disconnect(); } catch (_) { } }
            await deleteMsg(hansaka, jid, loadingMsg?.key);
            reply(formatMsg("Download Error", `Error: ${e.message}`));
        }
    }
});

module.exports = { animeState };

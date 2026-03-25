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
// GLOBAL DESIGN
// =============================================
const FOOTER_TEXT = "𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝";
const formatMsg = (title, body) =>
    `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦\n\n> ${FOOTER_TEXT}`;
const deleteMsg = async (hansaka, jid, key) => {
    try { if (key) await hansaka.sendMessage(jid, { delete: key }); } catch (_) { }
};

// =============================================
// STATE - 3-LEVEL HIERARCHY
// =============================================
// step: "series_select" → "range_select" → "file_select"
const animeState = {};
const PAGE_SIZE = 15;
const RANGE_SIZE = 50;
const MAX_BATCHES = 50; // up to 5000 results

// =============================================
// FILE HELPERS
// =============================================
function getRawFileName(msg) {
    if (msg.document?.attributes) {
        const attr = msg.document.attributes.find(a => a.className === "DocumentAttributeFilename");
        if (attr?.fileName) return attr.fileName;
    }
    return `File_${msg.id}`;
}

function getFileSize(msg) {
    try {
        const b = msg.document?.size;
        if (!b) return '';
        if (b >= 1073741824) return (b / 1073741824).toFixed(1) + 'GB';
        if (b >= 1048576) return Math.round(b / 1048576) + 'MB';
        return Math.round(b / 1024) + 'KB';
    } catch { return ''; }
}

// Strict episode regex - requires "ep/episode" prefix OR isolated 1-3 digit number
// Avoids matching 4-digit file IDs, resolutions (720), timestamps etc.
function extractEpisodeNumber(fileName) {
    // Priority 1: explicit "Ep" or "Episode" prefix
    const explicit = fileName.match(/ep(?:isode)?[.\s_-]?(\d{1,4})/i);
    if (explicit) return parseInt(explicit[1]);

    // Priority 2: isolated 2-3 digit number between separators (not 4 digits = avoid IDs)
    const isolated = fileName.match(/(?:^|[-_\s])(\d{2,3})(?:[-_\s]|$)/);
    if (isolated) return parseInt(isolated[1]);

    return null;
}

function getEpisodeDisplay(rawName, msg) {
    const epNum = extractEpisodeNumber(rawName);
    const qualMatch = rawName.match(/(\d{3,4}p)/i);
    const size = getFileSize(msg);
    const parts = [];
    if (epNum !== null) parts.push(`Ep.${epNum}`);
    else parts.push(rawName.replace(/@[\w._-]+/g, '').trim().substring(0, 30));
    if (qualMatch) parts.push(qualMatch[1]);
    if (size) parts.push(size);
    return parts.join(' | ');
}

// =============================================
// POLLINATIONS AI
// =============================================
function askPollinationsAI(prompt) {
    return new Promise((resolve, reject) => {
        const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&seed=42`;
        const req = https.get(url, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data.trim()));
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('AI timeout')); });
    });
}

// Detect distinct sub-series from a sample of file names
async function detectSubSeries(fileNames, query) {
    const sample = fileNames.slice(0, 80).map((n, i) =>
        `${i}: ${n.replace(/@[\w._-]+/g, '').trim().substring(0, 60)}`
    ).join('\n');

    const prompt = `These are anime file names from a search for "${query}".
Identify the distinct sub-series, seasons, or categories present (e.g. "Boruto: Naruto Next Generations", "Boruto Movies", "Boruto Dub").
Return ONLY a JSON string array. No explanation. Max 8 items.
Example: ["Series A", "Series B Movies"]
Files:\n${sample}`;

    try {
        const res = await askPollinationsAI(prompt);
        const match = res.match(/\[[\s\S]*?\]/);
        if (match) {
            const arr = JSON.parse(match[0]);
            if (Array.isArray(arr) && arr.length > 0) return arr;
        }
    } catch (e) {
        console.error('AI sub-series error:', e.message);
    }
    return null;
}

// Assign files to sub-series using keyword matching
function assignFilesToSeries(messages, fileNames, seriesLabels) {
    const groups = seriesLabels.map(label => ({
        label,
        // Extract meaningful keywords from label (skip short words)
        keywords: label.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 3),
        msgs: [],
        names: []
    }));
    const others = { label: 'Others', msgs: [], names: [] };

    fileNames.forEach((name, i) => {
        const nameLower = name.toLowerCase();
        let bestGroup = null;
        let bestScore = 0;

        groups.forEach(g => {
            const score = g.keywords.reduce((s, kw) => s + (nameLower.includes(kw) ? 1 : 0), 0);
            if (score > bestScore) { bestScore = score; bestGroup = g; }
        });

        if (bestGroup && bestScore > 0) {
            bestGroup.msgs.push(messages[i]);
            bestGroup.names.push(name);
        } else {
            others.msgs.push(messages[i]);
            others.names.push(name);
        }
    });

    const result = groups.filter(g => g.msgs.length > 0);
    if (others.msgs.length > 0) result.push(others);
    return result;
}

// Build episode ranges within a selected sub-series
function buildEpisodeRanges(msgs, names) {
    const episodic = [];
    const nonEpisodic = [];

    msgs.forEach((msg, i) => {
        const epNum = extractEpisodeNumber(names[i]);
        if (epNum !== null) {
            episodic.push({ msg, name: names[i], epNum });
        } else {
            nonEpisodic.push({ msg, name: names[i] });
        }
    });

    episodic.sort((a, b) => a.epNum - b.epNum);

    const ranges = [];
    for (let i = 0; i < episodic.length; i += RANGE_SIZE) {
        const chunk = episodic.slice(i, i + RANGE_SIZE);
        const nums = chunk.map(f => f.epNum).sort((a, b) => a - b);
        ranges.push({
            label: nums.length > 1 ? `Episodes ${nums[0]} - ${nums[nums.length - 1]}` : `Episode ${nums[0]}`,
            msgs: chunk.map(f => f.msg),
            names: chunk.map(f => f.name)
        });
    }
    if (nonEpisodic.length > 0) {
        ranges.push({
            label: `Movies & Specials (${nonEpisodic.length})`,
            msgs: nonEpisodic.map(f => f.msg),
            names: nonEpisodic.map(f => f.name)
        });
    }
    return ranges.length > 0 ? ranges : [{ label: 'All Files', msgs, names }];
}

// =============================================
// TEXT BUILDERS
// =============================================
function buildSeriesList(seriesGroups, query, total) {
    let text = `🔍 *"${query}"* - *${total}* ගොනු\n\n`;
    seriesGroups.forEach((g, i) => {
        text += `${i + 1}. 📂 ${g.label} *(${g.msgs.length})*\n`;
    });
    text += `\n💬 *Series number reply කරන්න*`;
    return formatMsg("🎬 Anime Search Results", text);
}

function buildRangeList(ranges, seriesLabel) {
    let text = `📂 *${seriesLabel}*\n\n`;
    ranges.forEach((r, i) => {
        text += `${i + 1}. 🗂️ ${r.label}\n`;
    });
    text += `\n💬 *Range number reply කරන්න*\n*0* → series list`;
    return formatMsg("📋 Episode Ranges", text);
}

function buildFileList(msgs, names, rangeLabel, page) {
    const start = page * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, msgs.length);
    const totalPages = Math.ceil(msgs.length / PAGE_SIZE);
    let text = `🗂️ *${rangeLabel}*\n`;
    if (totalPages > 1) text += `_(${page + 1}/${totalPages} page)_\n`;
    text += '\n';
    for (let i = start; i < end; i++) {
        text += `${i + 1}. 🎬 ${getEpisodeDisplay(names[i], msgs[i])}\n`;
    }
    text += '\n';
    if (page > 0) text += `*p* ← කලින\n`;
    if (end < msgs.length) text += `*n* → ඊළඟ\n`;
    text += `*0* → range list`;
    return formatMsg("📄 File List", text);
}

function buildProgressBar(percent) {
    const filled = Math.floor(percent / 5);
    return '█'.repeat(filled) + '░'.repeat(20 - filled);
}

// =============================================
// PAGINATED TELEGRAM SEARCH (up to 5000)
// =============================================
async function searchAllMessages(client, query, onProgress) {
    const all = [];
    let offsetId = 0;
    for (let i = 0; i < MAX_BATCHES; i++) {
        const batch = await client.getMessages(TARGET_CHANNEL, {
            search: query,
            limit: 100,
            offsetId,
            filter: new Api.InputMessagesFilterDocument()
        }).catch(() => []);
        if (!batch || batch.length === 0) break;
        all.push(...batch);
        offsetId = batch[batch.length - 1].id;
        if (onProgress) onProgress(all.length);
        if (batch.length < 100) break;
    }
    return all;
}

// =============================================
// MAIN COMMAND
// =============================================
cmd({
    pattern: "anime",
    alias: ["getanime", "downloadanime"],
    desc: "Search and download anime from Telegram",
    category: "anime",
    react: "🎬"
}, async (hansaka, mek, m, { q, reply }) => {
    if (!q) return reply(formatMsg("Missing Input", "Anime නම දෙන්න!\nExample: .anime Boruto"));

    const jid = m.chat || mek.key.remoteJid;
    const senderJid = m.sender || mek.key.participant || jid;
    let loadingMsg, client;

    try {
        loadingMsg = await hansaka.sendMessage(jid, { text: `🔍 *"${q}"* සෙවෙමින්...` });

        client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
        await client.connect();

        let lastProgressTime = 0;
        const messages = await searchAllMessages(client, q, async (count) => {
            const now = Date.now();
            if (now - lastProgressTime > 3000) {
                lastProgressTime = now;
                await hansaka.sendMessage(jid, {
                    text: `🔍 *${count}* ගොනු ලැබුණා, ගොනු *${q}* සොයමින්...`,
                    edit: loadingMsg.key
                }).catch(() => {});
            }
        });

        await client.disconnect();

        if (!messages?.length) {
            await deleteMsg(hansaka, jid, loadingMsg.key);
            return reply(formatMsg("Not Found", `*"${q}"* හොයාගන්න බැරි වුණා. 😔`));
        }

        await hansaka.sendMessage(jid, {
            text: `✅ *${messages.length}* ගොනු! AI ලෙස sub-series හඳුනාගනිමින්... 🤖`,
            edit: loadingMsg.key
        });

        const rawFileNames = messages.map(getRawFileName);

        // Level 1: AI detects sub-series
        const seriesLabels = await detectSubSeries(rawFileNames, q);
        let seriesGroups;
        if (seriesLabels && seriesLabels.length > 1) {
            seriesGroups = assignFilesToSeries(messages, rawFileNames, seriesLabels);
        } else {
            // Fallback: single group, go straight to ranges
            seriesGroups = [{ label: q, msgs: messages, names: rawFileNames }];
        }

        animeState[senderJid] = {
            step: "series_select",
            seriesGroups,
            searchQuery: q,
            jid
        };

        await deleteMsg(hansaka, jid, loadingMsg.key);
        await hansaka.sendMessage(jid, {
            text: buildSeriesList(seriesGroups, q, messages.length)
        }, { quoted: mek });

    } catch (e) {
        console.error("Anime Error:", e);
        if (client) try { await client.disconnect(); } catch (_) {}
        await deleteMsg(hansaka, jid, loadingMsg?.key);
        reply(formatMsg("Error", e.message));
    }
});

// =============================================
// REPLY HANDLER - 3-level navigation
// =============================================
cmd({
    pattern: undefined,
    filter: (mek, { sender }) => animeState[sender] !== undefined
}, async (hansaka, mek, m, { reply, sender, body }) => {
    const state = animeState[sender];
    if (!state) return;

    const jid = state.jid || m.chat || mek.key.remoteJid;
    const raw = (body || '').trim().toLowerCase();

    // ==================
    // LEVEL 1: Series
    // ==================
    if (state.step === 'series_select') {
        const n = parseInt(raw);
        if (isNaN(n) || n < 1 || n > state.seriesGroups.length)
            return reply(formatMsg("Invalid", `1 සිට ${state.seriesGroups.length} reply කරන්න.`));

        const chosen = state.seriesGroups[n - 1];
        const ranges = buildEpisodeRanges(chosen.msgs, chosen.names);

        state.step = 'range_select';
        state.selectedSeries = { label: chosen.label, msgs: chosen.msgs, names: chosen.names };
        state.episodeRanges = ranges;

        return await hansaka.sendMessage(jid, {
            text: buildRangeList(ranges, chosen.label)
        }, { quoted: mek });
    }

    // ==================
    // LEVEL 2: Ranges
    // ==================
    if (state.step === 'range_select') {
        if (raw === '0') {
            state.step = 'series_select';
            delete state.selectedSeries;
            delete state.episodeRanges;
            return await hansaka.sendMessage(jid, {
                text: buildSeriesList(state.seriesGroups, state.searchQuery, state.seriesGroups.reduce((s, g) => s + g.msgs.length, 0))
            }, { quoted: mek });
        }

        const n = parseInt(raw);
        if (isNaN(n) || n < 1 || n > state.episodeRanges.length)
            return reply(formatMsg("Invalid", `1 සිට ${state.episodeRanges.length} reply කරන්න.\n*0* → ආපහු`));

        const range = state.episodeRanges[n - 1];
        state.step = 'file_select';
        state.selectedRange = range;
        state.filePage = 0;

        return await hansaka.sendMessage(jid, {
            text: buildFileList(range.msgs, range.names, range.label, 0)
        }, { quoted: mek });
    }

    // ==================
    // LEVEL 3: Files
    // ==================
    if (state.step === 'file_select') {
        const { msgs, names, label } = state.selectedRange;

        if (raw === 'n') {
            if (state.filePage + 1 >= Math.ceil(msgs.length / PAGE_SIZE))
                return reply("ඊළඟ page නෑ.");
            state.filePage++;
            return await hansaka.sendMessage(jid, {
                text: buildFileList(msgs, names, label, state.filePage)
            }, { quoted: mek });
        }
        if (raw === 'p') {
            if (state.filePage <= 0) return reply("කලින් page නෑ.");
            state.filePage--;
            return await hansaka.sendMessage(jid, {
                text: buildFileList(msgs, names, label, state.filePage)
            }, { quoted: mek });
        }
        if (raw === '0') {
            state.step = 'range_select';
            delete state.selectedRange;
            delete state.filePage;
            return await hansaka.sendMessage(jid, {
                text: buildRangeList(state.episodeRanges, state.selectedSeries.label)
            }, { quoted: mek });
        }

        const n = parseInt(raw);
        if (isNaN(n) || n < 1 || n > msgs.length)
            return reply(formatMsg("Invalid", `1 සිට ${msgs.length} reply කරන්න.\n*n/p* = page | *0* = ආපහු`));

        const selectedMsg = msgs[n - 1];
        const rawName = names[n - 1];

        delete animeState[sender];

        let loadingMsg, client;
        try {
            const sizeStr = getFileSize(selectedMsg);
            const epDisplay = getEpisodeDisplay(rawName, selectedMsg);

            loadingMsg = await hansaka.sendMessage(jid, {
                text: `⏬ *Download Starting...*\n\n${'░'.repeat(20)}\n📊 *0%*\n🎬 ${epDisplay}${sizeStr ? `\n💾 ${sizeStr}` : ''}`
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

            // Live progress bar during download
            let lastEditTime = 0;
            let lastPercent = -10;

            const buffer = await client.downloadMedia(selectedMsg, {
                progressCallback: async (received, total) => {
                    const now = Date.now();
                    const percent = total > 0 ? Math.floor((received / total) * 100) : 0;
                    if (percent >= lastPercent + 10 && now - lastEditTime > 3000) {
                        lastPercent = percent;
                        lastEditTime = now;
                        const bar = buildProgressBar(percent);
                        await hansaka.sendMessage(jid, {
                            text: `⏬ *Downloading...*\n\n${bar}\n📊 *${percent}%*\n🎬 ${epDisplay}${sizeStr ? `\n💾 ${sizeStr}` : ''}`,
                            edit: loadingMsg.key
                        }).catch(() => {});
                    }
                }
            });

            fs.writeFileSync(tempFilePath, buffer);
            await client.disconnect();

            await hansaka.sendMessage(jid, {
                text: `🚀 *Upload to WhatsApp...*\n\n${'█'.repeat(20)}\n📊 *100%* ✅`,
                edit: loadingMsg.key
            }).catch(() => {});

            const mimetype = ext.toLowerCase().includes('mkv') ? 'video/x-matroska' : 'video/mp4';
            await hansaka.sendMessage(jid, {
                document: fs.readFileSync(tempFilePath),
                mimetype,
                fileName: newFileName,
                caption: formatMsg("✅ Download Complete", `🎬 ${epDisplay}\n📥 Olya x Telegram`)
            }, { quoted: mek });

            fs.unlinkSync(tempFilePath);
            await deleteMsg(hansaka, jid, loadingMsg.key);

        } catch (e) {
            console.error("Download Error:", e);
            if (client) try { await client.disconnect(); } catch (_) {}
            await deleteMsg(hansaka, jid, loadingMsg?.key);
            reply(formatMsg("Download Error", e.message));
        }
    }
});

module.exports = { animeState };

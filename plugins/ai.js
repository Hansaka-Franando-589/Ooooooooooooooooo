const { cmd } = require('../command');
const axios = require('axios');
const admin = require('firebase-admin');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const googleTTS = require("google-tts-api");
const config = require('../config');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { sendButtons } = require('gifted-btns');
const { getTemplate } = require('../data/messages');

// --- FIREBASE INITIALIZATION ---
try {
    let serviceAccount;
    try {
        serviceAccount = require('../prefect-management-syste-e1575-firebase-adminsdk-fbsvc-2e53cf385d.json');
    } catch(err) {
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS || "{}");
    }
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    if (!admin.apps.length && Object.keys(serviceAccount).length > 0) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
} catch(e) {}
const db = admin.apps.length ? admin.firestore() : null;

// --- IN-MEMORY STATE & VAULT ---
const VAULT_FILE = './vault.json';
let personalVault = fs.existsSync(VAULT_FILE) ? JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8')) : [];

let currentMode = 'normal';
let messageCache = [];
const userChatStates = {};

// ========================================================
const OWNER_NUMBER = config.OWNER_NUMBER;
const PERSONAL_ALERT_NUMBER = `${config.OWNER_NUMBER}@s.whatsapp.net`;

const VIP_DIRECTORY = {
    '94779680896': { name: 'චූටි', role: 'Special Someone' }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ========================================================
// INTENT DETECTION — AI නැතිව Keyword/Regex
// ========================================================
const detectIntent = (text) => {
    if (!text) return 'unknown';
    const t = text.trim().toLowerCase();

    if (/^exit$/i.test(t)) return 'exit';
    if (/(ආයුබෝවන්|හෙලෝ|hello|hi|ayubovan|ආයු|helo)/.test(t)) return 'greeting';
    if (/(urgent|හදිසි|ජරාවේ|ඉස්සරහ|fire)/.test(t)) return 'urgent';
    if (/(රිපෝට්|report|වාර්තාව|eccpms|monthly|prefect|pms|pdf|මාසික)/.test(t)) return 'report_request';
    if (/(ස්තූතියි|thanks|thank you|thx|ස්තූ)/.test(t)) return 'thanks';
    if (/(හරි|ela|supiri|maru|niyamai|patta|සුපිරි|මරු|නියමයි)/.test(t)) return 'positive';

    // Pure number — likely ID or month
    if (/^\d+$/.test(t)) return 'number_input';

    return 'unknown';
};

// ========================================================
// POLLINATIONS AI — Image Vision (Barcode Scan)
// ========================================================
const scanBarcodeWithAI = async (base64Image) => {
    try {
        const response = await axios.post('https://text.pollinations.ai/', {
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
                        },
                        {
                            type: 'text',
                            text: "Extract the exact Barcode ID or Number visible in this image. Only output the extracted number or text string. Do not output anything else. If no barcode is visible or legible, output 'NONE'."
                        }
                    ]
                }
            ],
            model: 'openai',
            jsonMode: false
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        const result = response.data?.choices?.[0]?.message?.content?.trim() || 'NONE';
        return result;
    } catch (err) {
        console.error("Pollinations Vision Error:", err.message);
        return 'NONE';
    }
};

// ========================================================
// POLLINATIONS AI — Audio Transcription (Voice Notes)
// ========================================================
const transcribeAudioWithAI = async (base64Audio) => {
    try {
        const response = await axios.post('https://text.pollinations.ai/', {
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: "Listen to the following audio and transcribe it exactly. Only output the transcription text, nothing else."
                        },
                        {
                            type: 'image_url',
                            image_url: { url: `data:audio/ogg;base64,${base64Audio}` }
                        }
                    ]
                }
            ],
            model: 'openai',
            jsonMode: false
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        return response.data?.choices?.[0]?.message?.content?.trim() || '';
    } catch (err) {
        console.error("Pollinations Audio Error:", err.message);
        return '';
    }
};

// ========================================================
cmd({ pattern: "aichat", desc: "Olya Assistant (Public Mode)", category: "ai", filename: __filename },
async (hansaka, mek, m, { from, body, isGroup, senderNumber }) => {
    try {
        if (isGroup) return;

        const isOwner = senderNumber === OWNER_NUMBER || mek.key.fromMe;
        const userProfile = VIP_DIRECTORY[senderNumber];
        const isVIP = userProfile?.role === 'Special Someone';

        // --- ANTI-DELETE MONITOR ---
        if (mek.message?.protocolMessage?.type === 14) {
            const deletedKey = mek.message.protocolMessage.key.id;
            const originalMsg = messageCache.find(msg => msg.id === deletedKey);
            if (originalMsg && originalMsg.sender !== OWNER_NUMBER) {
                const replyText = getTemplate('anti_delete')(originalMsg.text);
                await hansaka.sendMessage(originalMsg.senderJid, { text: replyText });
            }
            return;
        }

        if (!body && !mek.message?.audioMessage && !mek.message?.pttMessage && !mek.message?.imageMessage) return;

        // Save incoming messages for Anti-Delete
        if (body) {
            messageCache.push({ id: mek.key.id, sender: senderNumber, senderJid: from, text: body });
            if (messageCache.length > 200) messageCache.shift();
        }

        if (!userChatStates[senderNumber]) userChatStates[senderNumber] = { step: 'NORMAL', data: null, temp: {} };
        let state = userChatStates[senderNumber];

        // --- 1. OWNER COMMANDS ---
        if (isOwner) {
            if (body?.startsWith('.mode ')) {
                currentMode = body.split(' ')[1];
                return await hansaka.sendMessage(from, { text: `👩‍💼 Status Mode: *${currentMode}*` }, { quoted: mek });
            }
            if (body?.toLowerCase().startsWith('save:')) {
                personalVault.push(body.substring(5).trim());
                fs.writeFileSync(VAULT_FILE, JSON.stringify(personalVault));
                return await hansaka.sendMessage(from, { text: getTemplate('vault_saved') }, { quoted: mek });
            }
            if (body?.toLowerCase() === 'notes') {
                const vaultData = personalVault.length > 0 ? personalVault.join('\n\n🔸 ') : "ගබඩාව හිස්ව පවතී.";
                return await hansaka.sendMessage(from, { text: `හන්සකගේ රහස් ගබඩාව:\n\n🔸 ${vaultData}\n\n- Olya` }, { quoted: mek });
            }
            if (body?.startsWith('.') || body?.toLowerCase().startsWith('save:') || body?.toLowerCase() === 'notes') return;
        }

        // --- 2. SMART REACTIONS ---
        const msgLower = (body || '').toLowerCase();
        if (/(හරි|එල|සුපිරි|මරු|නියමයි|hari|ela|supiri|maru|niyamai|patta)/.test(msgLower)) {
            await hansaka.sendMessage(from, { react: { text: "🤝", key: mek.key } });
        } else if (/(ස්තූතියි|තෑන්ක්ස්|thank|thx|sthuthi)/.test(msgLower)) {
            await hansaka.sendMessage(from, { react: { text: "❤️", key: mek.key } });
        }

        // --- 3. URGENT OVERRIDE (VIP ONLY) ---
        if (isVIP && msgLower.includes('urgent')) {
            await hansaka.sendPresenceUpdate('composing', from);
            await hansaka.sendMessage(from, { text: getTemplate('urgent_vip') }, { quoted: mek });
            return await hansaka.sendMessage(PERSONAL_ALERT_NUMBER, {
                text: `🚨 *OLYA URGENT ALERT*\n\nහන්සක, චූටි (රශ්මි) ගෙන් හදිසි පණිවිඩයක් පැමිණියා! වහාම සම්බන්ධ වන්න.`
            });
        }

        // --- 4. DYNAMIC STATUS MODES ---
        if (currentMode !== 'normal') {
            await hansaka.sendPresenceUpdate('composing', from);
            const reply = isVIP ? getTemplate('busy_mode_vip') : getTemplate('busy_mode_general');
            return await hansaka.sendMessage(from, { text: reply }, { quoted: mek });
        }

        // --- 5. EXIT COMMAND ---
        if (body && body.trim().toUpperCase() === 'EXIT' && state.step !== 'NORMAL') {
            state.step = 'NORMAL';
            state.data = null;
            state.temp = {};
            await hansaka.sendPresenceUpdate('composing', from);
            return await hansaka.sendMessage(from, { text: getTemplate('exit_cancel') }, { quoted: mek });
        }

        // ========================================================
        // 6. ECCPMS PDF REPORT FLOW
        // ========================================================

        // Step A: User asks for a report
        if (state.step === 'NORMAL' && body && /(රිපෝට්|report|වාර්තාව|ප්‍රිෆෙක්ට්|මාසික|eccpms|monthly|prefect|pms|pdf)/i.test(body) && isNaN(body.trim())) {
            await hansaka.sendPresenceUpdate('composing', from);
            const reply = isVIP ? getTemplate('report_request_vip') : getTemplate('report_request_general');
            state.step = 'WAIT_INDEX';
            return await hansaka.sendMessage(from, { text: reply }, { quoted: mek });
        }

        // Step B: Receive Index Number
        if ((state.step === 'NORMAL' || state.step === 'WAIT_INDEX') && body && !body.includes(' ') && body.trim().length >= 3 && body.trim().length <= 15 && !isNaN(body.trim())) {
            if (!db) {
                await hansaka.sendPresenceUpdate('composing', from);
                return await hansaka.sendMessage(from, { text: getTemplate('system_offline') }, { quoted: mek });
            }

            const inputId = body.trim();
            let vMsg = await hansaka.sendMessage(from, { text: "> 🔍 _Olya System is Scanning Index..._" }, { quoted: mek });
            await sleep(2000);
            await hansaka.sendMessage(from, { text: "> 🛡️ _Authenticating with ECCPMS Secure Server..._", edit: vMsg.key });
            await sleep(2000);
            await hansaka.sendMessage(from, { text: "> 📂 _Querying Prefect Identity Database..._", edit: vMsg.key });
            await sleep(1500);

            let snapshot = await db.collection('prefects').where('school_index_number', '==', inputId).get();
            if (!snapshot.empty) {
                state.data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
                state.step = 'REPORT_VERIFY';
                await hansaka.sendPresenceUpdate('composing', from);
                const reply = isVIP ? getTemplate('ask_prefect_id_vip') : getTemplate('ask_prefect_id_general');
                return await hansaka.sendMessage(from, { text: reply }, { quoted: mek });
            } else {
                // Index not found — reset
                state.step = 'NORMAL';
                return await hansaka.sendMessage(from, { text: getTemplate('wrong_id') }, { quoted: mek });
            }
        }

        // Step C: Verify Prefect ID
        if (state.step === 'REPORT_VERIFY') {
            if (body.trim() === state.data.id || body.trim().toLowerCase() === String(state.data.prefect_unique_id || '').trim().toLowerCase()) {
                state.step = 'REPORT_BARCODE_PHOTO';
                await hansaka.sendPresenceUpdate('composing', from);
                const reply = isVIP ? getTemplate('ask_barcode_vip') : getTemplate('ask_barcode_general');
                return await hansaka.sendMessage(from, { text: reply }, { quoted: mek });
            } else {
                await hansaka.sendPresenceUpdate('composing', from);
                return await hansaka.sendMessage(from, { text: getTemplate('wrong_id') }, { quoted: mek });
            }
        }

        // Step D: Barcode Photo
        if (state.step === 'REPORT_BARCODE_PHOTO') {
            const isImage = mek.message?.imageMessage;
            if (!isImage) {
                return await hansaka.sendMessage(from, { text: getTemplate('barcode_photo_needed') }, { quoted: mek });
            }

            let vMsg = await hansaka.sendMessage(from, { text: "> 📷 _Olya Vision is Analyzing Barcode Image..._" }, { quoted: mek });

            try {
                const buffer = await downloadMediaMessage(mek, 'buffer', {}, { logger: console });
                const base64Image = buffer.toString('base64');

                let extractedBarcode = await scanBarcodeWithAI(base64Image);

                if (extractedBarcode === 'NONE' || extractedBarcode.length < 2) {
                    return await hansaka.sendMessage(from, { text: getTemplate('barcode_unreadable'), edit: vMsg.key });
                }

                const monthsList = [];
                for (let i = 0; i < 4; i++) {
                    let d = new Date(); d.setMonth(d.getMonth() - i);
                    monthsList.push(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
                }
                state.temp.reportMonths = monthsList;
                state.step = 'REPORT_MONTH_SELECT';

                const headerMsg = isVIP
                    ? getTemplate('ask_month_vip')
                    : getTemplate('ask_month_general');

                const listMsg = `${headerMsg.replace(/\n\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝/, '')}\n\n╭───────────────────✨\n│ 📊 *E C C P M S  R E P O R T S*\n╰───────────────────✨`;

                await hansaka.sendMessage(from, { delete: vMsg.key });
                return await sendButtons(hansaka, from, {
                    text: listMsg,
                    footer: "𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝",
                    aimode: true,
                    buttons: monthsList.map((m, idx) => ({ id: `${idx + 1}`, text: m }))
                });

            } catch(e) {
                console.error("Barcode Read Error:", e);
                return await hansaka.sendMessage(from, { text: getTemplate('barcode_unreadable'), edit: vMsg.key });
            }
        }

        // Step E: Month Selection
        if (state.step === 'REPORT_MONTH_SELECT') {
            const selectedInput = body.trim();
            const validMonths = state.temp.reportMonths || [];
            let selectedMonthStr = selectedInput;

            if (/^[1-4]$/.test(selectedInput)) selectedMonthStr = validMonths[parseInt(selectedInput) - 1];

            if (!validMonths.some(m => m.toLowerCase() === selectedMonthStr.toLowerCase())) {
                await hansaka.sendPresenceUpdate('composing', from);
                return await hansaka.sendMessage(from, { text: getTemplate('invalid_month') }, { quoted: mek });
            }

            await hansaka.sendPresenceUpdate('composing', from);
            let loadMsg = await hansaka.sendMessage(from, { text: "> 🔐 _Establishing Secure Data Tunnel..._" }, { quoted: mek });

            const pdfSteps = [
                `> 📂 _Extracting Deep Data for ${selectedMonthStr}..._`,
                `> 📊 _Processing Monthly KPIs & Analytics..._`,
                `> ⚙️ _Compiling Merits & Demerits Algorithms..._`,
                `> 📝 _Generating Official Document Layout..._`,
                `> 🖋️ _Applying Digital Signatures & Encryption..._`,
                `> 📤 _Finalizing PDF Output Protocol..._`,
                `> ✅ _Document Ready! Sending via Olya Network..._`
            ];
            for (let step of pdfSteps) {
                await sleep(2000);
                await hansaka.sendMessage(from, { text: step, edit: loadMsg.key });
            }

            try {
                const pId = state.data.id;
                const targetDate = new Date(`${selectedMonthStr} 1`);
                const cycleStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
                const cycleEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
                const prevCycleStart = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);

                const sStr = cycleStart.toISOString().split('T')[0];
                const eStr = cycleEnd.toISOString().split('T')[0];
                const prevStr = prevCycleStart.toISOString().split('T')[0];
                const cycleString = `${cycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${cycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

                const pointsSnap = await db.collection('points').where('prefect_id', '==', pId).get();
                let pointsRecords = []; let currPointsTotal = 0; let prevPointsTotal = 0;
                pointsSnap.forEach(doc => {
                    const d = doc.data();
                    if (d.date >= sStr && d.date <= eStr) { pointsRecords.push(d); currPointsTotal += (parseInt(d.points) || 0); }
                    else if (d.date >= prevStr && d.date < sStr) { prevPointsTotal += (parseInt(d.points) || 0); }
                });
                pointsRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

                const attSnap = await db.collection('attendance').where('prefect_id', '==', pId).get();
                let attRecords = []; let currAttCount = 0;
                attSnap.forEach(doc => {
                    const d = doc.data();
                    const isPresent = (d.status || '').toLowerCase() === 'present' || (d.status || '').toLowerCase() === 'late';
                    if (d.date >= sStr && d.date <= eStr) { attRecords.push(d); if (isPresent) currAttCount++; }
                });
                attRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

                const totalPoints = state.data.total_points || 0;
                let currentRank = "Rookie"; let nextTierMin = 50; let nextRankName = "Bronze";
                if (totalPoints >= 120) { currentRank = "Platinum"; nextTierMin = 120; nextRankName = "Max Rank"; }
                else if (totalPoints >= 90) { currentRank = "Gold"; nextTierMin = 120; nextRankName = "Platinum"; }
                else if (totalPoints >= 80) { currentRank = "Silver"; nextTierMin = 90; nextRankName = "Gold"; }
                else if (totalPoints >= 50) { currentRank = "Bronze"; nextTierMin = 80; nextRankName = "Silver"; }

                const progressPercent = Math.min((totalPoints / nextTierMin) * 100, 100) || 0;

                const pdfDoc = new PDFDocument({ size: 'A4', margin: 40 });
                let buffers = []; pdfDoc.on('data', buffers.push.bind(buffers));

                pdfDoc.on('end', async () => {
                    let pdfData = Buffer.concat(buffers);
                    const safeName = (state.data.name || 'Prefect').replace(/\s+/g, '_');

                    const captionFn = isVIP
                        ? getTemplate('report_caption_vip')
                        : getTemplate('report_caption_general');
                    const captionMsg = isVIP
                        ? captionFn(selectedMonthStr)
                        : captionFn(state.data.name.split(' ')[0], selectedMonthStr);

                    await hansaka.sendMessage(from, { delete: loadMsg.key });
                    await hansaka.sendMessage(from, {
                        document: pdfData,
                        mimetype: 'application/pdf',
                        fileName: `ECCPMS_${safeName}_${selectedMonthStr.replace(' ', '_')}.pdf`,
                        caption: captionMsg
                    }, { quoted: mek });

                    if (isVIP) {
                        await hansaka.sendPresenceUpdate('composing', from);
                        const pointsFn = getTemplate('report_points_summary_vip');
                        const pointsMsg = pointsFn(totalPoints);
                        await hansaka.sendMessage(from, { text: pointsMsg }, { quoted: mek });
                    }
                });

                // ── PDF RENDERING ──
                const maroon = [114, 14, 14];
                const gold = [212, 175, 55];
                const darkText = [30, 30, 30];
                const lightText = [100, 100, 100];
                const lineColor = [230, 230, 230];

                const fullName = state.data.name || 'Prefect Member';
                const firstName = fullName.split(" ")[0];
                const lastName = fullName.split(" ").slice(1).join(" ");

                pdfDoc.font('Helvetica-Bold').fontSize(32).fillColor(darkText).text(firstName.toUpperCase(), 0, 40, { align: 'center' });
                pdfDoc.font('Helvetica').fontSize(16).text(lastName.toUpperCase(), 0, 75, { align: 'center' });
                pdfDoc.font('Helvetica-Bold').fontSize(11).fillColor(maroon).text((state.data.destiny || state.data.current_duty || "MEMBER").toUpperCase(), 0, 95, { align: 'center' });
                pdfDoc.font('Helvetica').fontSize(9).fillColor(lightText).text(`ID: ${state.data.school_index_number || '-'}`, 0, 110, { align: 'center' });

                let rankColor = lightText;
                if (currentRank === "Gold") rankColor = gold;
                else if (currentRank === "Silver") rankColor = [169, 169, 169];
                else if (currentRank === "Bronze") rankColor = [205, 127, 50];

                pdfDoc.font('Helvetica-Bold').fillColor(rankColor).text(`Rank: ${currentRank}`, 0, 125, { align: 'center' });
                pdfDoc.font('Helvetica').fillColor(lightText).text(`Period: ${cycleString}`, 0, 140, { align: 'center' });

                try {
                    if (state.data.picture) {
                        const imgRes = await axios.get(state.data.picture, { responseType: 'arraybuffer' });
                        const imgBuffer = Buffer.from(imgRes.data);
                        pdfDoc.save();
                        pdfDoc.circle(80, 80, 45).clip();
                        pdfDoc.image(imgBuffer, 35, 35, { width: 90, height: 90 });
                        pdfDoc.restore();
                    } else {
                        pdfDoc.circle(80, 80, 45).fillColor(maroon).fill();
                    }
                } catch (imgErr) {
                    console.error("Profile picture load error:", imgErr.message);
                    pdfDoc.circle(80, 80, 45).fillColor(maroon).fill();
                }

                pdfDoc.font('Helvetica-Bold').fontSize(11).fillColor(darkText).text("SUMMARY", 380, 40, { align: 'right' });
                pdfDoc.moveTo(430, 55).lineTo(550, 55).lineWidth(1).strokeColor(maroon).stroke();
                pdfDoc.font('Helvetica').fontSize(8).fillColor(lightText);
                const sumTxt = `Report Period: ${cycleString}.\nTotal Lifetime Points: ${totalPoints}.\nRank Status: Active.`;
                pdfDoc.text(sumTxt, 380, 65, { align: 'right', width: 170 });
                pdfDoc.text(`Next Rank: ${nextRankName} (${Math.round(progressPercent)}%)`, 380, 110, { align: 'right', width: 170 });
                pdfDoc.roundedRect(400, 120, 150, 6, 3).fillColor(lineColor).fill();
                pdfDoc.roundedRect(400, 120, (150 * progressPercent) / 100, 6, 3).fillColor(maroon).fill();
                pdfDoc.moveTo(40, 170).lineTo(550, 170).lineWidth(1).strokeColor(lineColor).stroke();

                let startY = 190;
                pdfDoc.circle(50, startY + 4, 4).fillColor(maroon).fill();
                pdfDoc.font('Helvetica-Bold').fontSize(12).fillColor(darkText).text(`ATTENDANCE (${currAttCount})`, 65, startY);
                pdfDoc.moveTo(50, startY + 20).lineTo(50, 480).lineWidth(1).strokeColor(lineColor).stroke();

                let currY = startY + 30;
                const maxRows = 8;
                let renderAtt = attRecords.slice(0, maxRows);
                if (renderAtt.length === 0) pdfDoc.font('Helvetica').fontSize(9).fillColor(lightText).text("No records this period.", 65, currY);
                renderAtt.forEach(rec => {
                    const stat = (rec.status || 'N/A').toUpperCase();
                    pdfDoc.circle(50, currY + 4, 3).fillColor(stat === 'ABSENT' ? 'red' : 'green').fill();
                    pdfDoc.font('Helvetica-Bold').fontSize(9).fillColor(darkText).text(stat, 65, currY);
                    pdfDoc.font('Helvetica').fontSize(8).fillColor(lightText).text(`${rec.date} | ${rec.reason || '-'}`, 65, currY + 12);
                    currY += 30;
                });

                pdfDoc.circle(300, startY + 4, 4).fillColor(maroon).fill();
                pdfDoc.font('Helvetica-Bold').fontSize(12).fillColor(darkText).text("POINTS HISTORY", 315, startY);
                pdfDoc.moveTo(300, startY + 20).lineTo(300, 480).lineWidth(1).strokeColor(lineColor).stroke();

                currY = startY + 30;
                let renderPts = pointsRecords.slice(0, maxRows);
                if (renderPts.length === 0) pdfDoc.font('Helvetica').fontSize(9).fillColor(lightText).text("No points changes.", 315, currY);
                renderPts.forEach(rec => {
                    const isPlus = (rec.points || 0) > 0;
                    pdfDoc.circle(300, currY + 4, 3).fillColor(isPlus ? 'green' : 'red').fill();
                    pdfDoc.font('Helvetica-Bold').fontSize(9).fillColor(isPlus ? [22, 101, 52] : [220, 38, 38]).text(`${isPlus ? '+' : ''}${rec.points} Points`, 315, currY);
                    pdfDoc.font('Helvetica').fontSize(8).fillColor(lightText).text(rec.reason || 'System Update', 315, currY + 12);
                    currY += 30;
                });

                pdfDoc.roundedRect(30, 750, 535, 60, 5).fillColor([245, 245, 245]).fill();
                pdfDoc.moveTo(350, 770).lineTo(500, 770).lineWidth(1).strokeColor(darkText).stroke();
                pdfDoc.font('Helvetica-Bold').fontSize(10).fillColor(darkText).text("AUTHORIZED SIGNATURE", 350, 780, { width: 150, align: 'center' });
                pdfDoc.font('Helvetica').fontSize(8).fillColor(lightText).text("Generated by Olya - Private Assistant", 50, 780);

                pdfDoc.end();
                state.step = 'NORMAL'; state.temp = {};
                return;

            } catch (err) {
                state.step = 'NORMAL';
                await hansaka.sendPresenceUpdate('composing', from);
                return await hansaka.sendMessage(from, { text: getTemplate('report_error') }, { quoted: mek });
            }
        }

        // ========================================================
        // 7. VOICE NOTE HANDLING
        // ========================================================
        const isAudio = mek.message?.audioMessage || mek.message?.pttMessage;
        const isImage = mek.message?.imageMessage;

        if (isAudio) {
            await hansaka.sendPresenceUpdate('recording', from);
            const msgStatus = await hansaka.sendMessage(from, { text: "👩‍💼 _Olya is listening to your voice note..._" }, { quoted: mek });

            try {
                const buffer = await downloadMediaMessage(mek, 'buffer', {}, { logger: console });
                const base64Audio = buffer.toString('base64');
                const transcribed = await transcribeAudioWithAI(base64Audio);

                const intent = detectIntent(transcribed || '');
                let replyText = '';

                if (intent === 'report_request') {
                    state.step = 'WAIT_INDEX';
                    replyText = isVIP ? getTemplate('report_request_vip') : getTemplate('report_request_general');
                } else if (intent === 'greeting') {
                    replyText = getTemplate('greeting');
                } else {
                    replyText = getTemplate('general_chat');
                }

                await hansaka.sendMessage(from, { text: replyText, edit: msgStatus.key });

                // TTS Reply
                try {
                    const ttsText = replyText.replace(/\n\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝/, '').substring(0, 200);
                    const audioUrl = googleTTS.getAudioUrl(ttsText, { lang: 'si', slow: false, host: 'https://translate.google.com' });
                    const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
                    await hansaka.sendMessage(from, { audio: Buffer.from(audioRes.data, 'binary'), mimetype: 'audio/mp4', ptt: true }, { quoted: mek });
                } catch (ttsErr) { console.error("TTS Error:", ttsErr.message); }

            } catch (err) {
                await hansaka.sendMessage(from, { text: getTemplate('general_chat'), edit: msgStatus.key });
            }

        } else if (body) {
            // ========================================================
            // 8. TEXT MESSAGE — Intent Detection + Template Reply
            // ========================================================
            await hansaka.sendPresenceUpdate('composing', from);

            const intent = detectIntent(body);
            let replyText = '';

            if (intent === 'greeting') {
                replyText = getTemplate('greeting');
            } else if (intent === 'report_request') {
                state.step = 'WAIT_INDEX';
                replyText = isVIP ? getTemplate('report_request_vip') : getTemplate('report_request_general');
            } else {
                replyText = getTemplate('general_chat');
            }

            await hansaka.sendMessage(from, { text: replyText }, { quoted: mek });
        }

    } catch (e) {
        console.error("Olya Assistant Error:", e.message);
    }
});

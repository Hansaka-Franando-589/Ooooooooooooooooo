const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const P = require('pino');
const express = require('express');
const axios = require('axios');
const path = require('path');
const qrcode = require('qrcode-terminal');

const originalLog = console.log;
console.log = function(...args) {
    if (typeof args[0] === 'string' && !args[0].includes('𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪')) {
        args[0] = `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 | ` + args[0];
    }
    originalLog.apply(console, args);
};

const config = require('./config');
const { sms, downloadMediaMessage } = require('./lib/msg');
const {
  getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson
} = require('./lib/functions');
const { File } = require('megajs');
const { commands, replyHandlers } = require('./command');

const app = express();
const port = process.env.PORT || 8000;

const prefix = '.';
const ownerNumber = [config.OWNER_NUMBER];
const credsPath = path.join(__dirname, '/auth_info_baileys/creds.json');

const globalMsgCache = {};
const spamCheck = {};

async function ensureSessionFile() {
  if (!fs.existsSync(credsPath)) {
    console.log("🔄 No local session found.");
    if (config.SESSION_ID) {
      fs.mkdirSync(path.join(__dirname, '/auth_info_baileys/'), { recursive: true });
      
      const sessdata = config.SESSION_ID;
      
      // If it looks like a MEGA link
      if (sessdata.includes('mega.nz')) {
         console.log("🔄 Attempting to download session from MEGA...");
         try {
           const filer = File.fromURL(sessdata);
           filer.download((err, data) => {
             if (err) throw err;
             fs.writeFileSync(credsPath, data);
             console.log("✅ Session downloaded from MEGA. Starting bot...");
             setTimeout(() => connectToWA(), 2000);
           });
           return;
         } catch (e) {
           console.error("❌ MEGA Session failed.");
         }
      } 
      
      // Otherwise, assume it is a Base64 string
      try {
        console.log("🔄 Attempting to decode Base64 Session ID...");
        const decodedCreds = Buffer.from(sessdata, 'base64').toString('utf-8');
        // Simple check if it's valid JSON
        JSON.parse(decodedCreds); 
        fs.writeFileSync(credsPath, decodedCreds);
        console.log("✅ Session decoded and saved. Starting bot...");
        setTimeout(() => connectToWA(), 2000);
      } catch (e) {
        console.log("❌ config.SESSION_ID is not a valid Base64 or MEGA ID. Starting fresh...");
        setTimeout(() => connectToWA(), 1000);
      }
    } else {
      console.log("🔄 No SESSION_ID found. Starting process to generate Pairing Code...");
      setTimeout(() => connectToWA(), 1000);
    }
  } else {
    console.log("✅ Local session found. Starting bot...");
    setTimeout(() => connectToWA(), 1000);
  }
}

async function connectToWA() {
  console.log("Connecting Olya Assistant 🧬...");
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, '/auth_info_baileys/'));
  const { version } = await fetchLatestBaileysVersion();

  const hansaka = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Firefox"),
    auth: state,
    version,
    syncFullHistory: true,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
  });

  // Pairing Code Logic
  if (!hansaka.authState.creds.registered) {
    const phoneNumber = config.BOT_NUMBER.replace(/[^0-9]/g, ''); 
    
    // ⏱️ Delay එක තත්පර 6ක් දක්වා වැඩි කර ඇත
    setTimeout(async () => {
      try {
        let code = await hansaka.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`\n=========================================\n`);
        console.log(`🔑 ඔබේ පේයාරිං කේතය (PAIRING CODE): \x1b[32m${code}\x1b[0m`);
        console.log(`ඔබගේ WhatsApp හි 'Linked Devices' වෙත ගොස් 'Link with Phone Number' හරහා ඉහත කේතය ලබා දෙන්න.`);
        console.log(`\n=========================================\n`);
      } catch (err) {
        console.log("❌ Pairing Code එක ලබා ගැනීමේදී දෝෂයක් ඇතිවිය: ", err);
      }
    }, 6000); 
  }

  hansaka.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        connectToWA();
      }
    } else if (connection === 'open') {
      console.log('✅ Olya Assistant connected to WhatsApp');
      await hansaka.sendPresenceUpdate('available'); 

      try {
        fs.readdirSync("./plugins/").forEach((plugin) => {
          if (path.extname(plugin).toLowerCase() === ".js") {
            require(`./plugins/${plugin}`);
          }
        });
        console.log('✅ Plugins loaded successfully');
      } catch (err) {
        console.error('❌ Failed to load plugins:', err);
      }

      const up = `Olya Assistant connected ✅\n\nPREFIX: ${prefix}`;
      try {
        await hansaka.sendMessage(ownerNumber[0] + "@s.whatsapp.net", { text: up });
      } catch (err) {
        console.error('❌ Failed to send startup message:', err);
      }
    }
  });

  hansaka.ev.on('creds.update', saveCreds);

  hansaka.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.messageStubType === 68) {
        await hansaka.sendMessageAck(msg.key);
      }
    }

    const mek = messages[0];
    if (!mek || !mek.message) return;

    const isRevoke = mek.message?.protocolMessage?.type === 0 || mek.message?.protocolMessage?.type === 'REVOKE';
    if (isRevoke) {
        const deletedKey = mek.message.protocolMessage.key.id;
        const ogMek = globalMsgCache[deletedKey];
        if (ogMek && !mek.key.fromMe) {
            const senderId = ogMek.key.participant || ogMek.key.remoteJid;
            const targetJid = mek.key.remoteJid;
            const pmType = getContentType(ogMek.message);
            const ogBody = pmType === 'conversation' ? ogMek.message.conversation : ogMek.message[pmType]?.text || ogMek.message[pmType]?.caption || '';
            
            try {
                const { GoogleGenerativeAI } = require("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEYS[Math.floor(Math.random() * config.GEMINI_API_KEYS.length)]);
                const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                
                let promptMsg = `A user just deleted a message on WhatsApp. Act as Olya, the highly advanced AI assistant to Hansaka. Speak strictly in natural Sinhala script. Address the person politely. Say something like: 'You just deleted a message, but as an advanced AI, I saved it. Here is what you deleted:'. Keep it very short, polite, and human-like. Do not mention Rashmi or special titles unless instructed.`;
                const res = await geminiModel.generateContent(promptMsg);
                let aiWarning = res.response.text().trim() + "\n\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝";
                if (ogBody && !pmType.includes('image') && !pmType.includes('video') && !pmType.includes('audio') && !pmType.includes('document')) {
                    aiWarning += `\n\n💬 *Deleted Message:* "${ogBody}"`;
                }
                
                const { downloadMediaMessage } = require('@whiskeysockets/baileys');
                if (pmType.includes('image') || pmType.includes('video') || pmType.includes('audio') || pmType.includes('document') || pmType.includes('sticker')) {
                    const buffer = await downloadMediaMessage(ogMek, 'buffer', {}, { logger: console });
                    let mediaObj = {};
                    if (pmType.includes('image')) mediaObj = { image: buffer, caption: aiWarning + (ogBody ? `\n\nCaption: ${ogBody}` : '') };
                    else if (pmType.includes('video')) mediaObj = { video: buffer, caption: aiWarning + (ogBody ? `\n\nCaption: ${ogBody}` : '') };
                    else if (pmType.includes('audio')) mediaObj = { audio: buffer, mimetype: 'audio/mp4', ptt: ogMek.message[pmType].ptt };
                    else mediaObj = { document: buffer, caption: aiWarning + (ogBody ? `\n\nCaption: ${ogBody}` : ''), mimetype: ogMek.message[pmType]?.mimetype || 'application/pdf' };
                    
                    if (pmType.includes('audio') || pmType.includes('sticker')) {
                        await hansaka.sendMessage(targetJid, { text: aiWarning });
                        await hansaka.sendMessage(targetJid, mediaObj);
                    } else {
                        await hansaka.sendMessage(targetJid, mediaObj);
                    }
                } else {
                    await hansaka.sendMessage(targetJid, { text: aiWarning });
                }
            } catch (err) {
                console.log("Anti-Delete error:", err);
            }
        }
    }

    if (mek.key.fromMe) return; 

    // Send read receipt (Blue Ticks)
    await hansaka.readMessages([mek.key]);

    const from = mek.key.remoteJid;
    let type = getContentType(mek.message);

    // Auto View Status and React with Skull
    if (from === 'status@broadcast') {
        try {
            // Usually we react indicating we viewed it fast
            await hansaka.sendMessage(from, { react: { text: "💀", key: mek.key } });
        } catch (err) {
            console.error("Auto status react error:", err);
        }
        return;
    }

    if (type === 'ephemeralMessage') {
        mek.message = mek.message.ephemeralMessage.message;
        type = getContentType(mek.message);
    } else if (type === 'viewOnceMessage') {
        mek.message = mek.message.viewOnceMessage.message;
        type = getContentType(mek.message);
    } else if (type === 'viewOnceMessageV2') {
        mek.message = mek.message.viewOnceMessageV2.message;
        type = getContentType(mek.message);
    } else if (type === 'viewOnceMessageV2Extension') {
        mek.message = mek.message.viewOnceMessageV2Extension.message;
        type = getContentType(mek.message);
    } else if (type === 'documentWithCaptionMessage') {
        mek.message = mek.message.documentWithCaptionMessage.message;
        type = getContentType(mek.message);
    }
    
    const isViewOnce = type === 'viewOnceMessage' || type === 'viewOnceMessageV2' || type === 'viewOnceMessageV2Extension';
    if (isViewOnce && !mek.key.fromMe) {
        try {
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const buffer = await downloadMediaMessage(mek, 'buffer', {}, { logger: console });
            
            const { getTemplate } = require('./data/messages');
            const aiCapt = getTemplate('view_once_intercept');
            
            const voType = Object.keys(mek.message[type]?.message || mek.message[type] || {})[0] || 'imageMessage';
            const isVideo = voType === 'videoMessage';
            
            await hansaka.sendMessage(from, { [isVideo ? 'video' : 'image']: buffer, caption: aiCapt }, { quoted: mek });
        } catch (err) {
            console.log("Viewonce error:", err);
            const { getTemplate } = require('./data/messages');
            await hansaka.sendMessage(from, { text: getTemplate('view_once_intercept') }, { quoted: mek });
        }
    }

    if (from === 'status@broadcast') {
        const statusKey = {
            remoteJid: from,
            id: mek.key.id,
            participant: mek.key.participant || mek.participant
        };
        await hansaka.readMessages([statusKey]);
        if (Math.random() < 0.3) {
            const emojis = ['❤️', '🔥', '😎', '💯'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            await hansaka.sendMessage(from, { react: { text: randomEmoji, key: mek.key } });
        }
        return;
    }

    const m = sms(hansaka, mek);
    let body = type === 'conversation' ? mek.message.conversation : mek.message[type]?.text || mek.message[type]?.caption || '';
    
    // Auto-extract Button Payload IDs
    if (type === 'interactiveResponseMessage') {
        try {
            const paramsJsonStr = mek.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
            if (paramsJsonStr) {
                const paramsJson = JSON.parse(paramsJsonStr);
                if (paramsJson && paramsJson.id) body = paramsJson.id;
            }
        } catch (e) {}
    } else if (type === 'templateButtonReplyMessage') {
        body = mek.message.templateButtonReplyMessage.selectedId || mek.message.templateButtonReplyMessage.selectedDisplayText;
    } else if (type === 'buttonsResponseMessage') {
        body = mek.message.buttonsResponseMessage.selectedButtonId || mek.message.buttonsResponseMessage.selectedDisplayText;
    } else if (type === 'listResponseMessage') {
        body = mek.message.listResponseMessage.singleSelectReply.selectedRowId;
    }
    
    globalMsgCache[mek.key.id] = mek;
    
    let possibleCmdStr = body.trim().split(/ +/)[0].toLowerCase();
    let isCmd = body.startsWith(prefix);
    let commandName = isCmd ? possibleCmdStr.slice(prefix.length) : possibleCmdStr;
    
    // Auto-detect prefixless commands (to bypass AI processing for known commands)
    if (!isCmd && commandName.length > 0) {
        const foundCmd = commands.find(c => c.pattern === commandName || (c.alias && c.alias.includes(commandName)));
        if (foundCmd) {
            isCmd = true;
        } else if (body !== 'btn_action_menu') {
            commandName = '';
        }
    }

    let args = body.trim().split(/ +/).slice(1);
    let q = args.join(' ');
    
    // Process Menu Action Button
    if (body === 'btn_action_menu') {
        isCmd = true;
        commandName = 'menu';
    }

    const sender = mek.key.fromMe ? hansaka.user.id : (mek.key.participant || mek.key.remoteJid);
    const senderNumber = sender.split('@')[0];
    const isGroup = from.endsWith('@g.us');
    const botNumber = hansaka.user.id.split(':')[0];
    const pushname = mek.pushName || 'Sin Nombre';
    const isMe = botNumber.includes(senderNumber);
    const isOwner = ownerNumber.includes(senderNumber) || isMe;
    const botNumber2 = await jidNormalizedUser(hansaka.user.id);

    const isChuti = senderNumber === '94779680896'; // Rashmi

    const isButton = type === 'interactiveResponseMessage' || type === 'templateButtonReplyMessage' || type === 'buttonsResponseMessage' || type === 'listResponseMessage';

    if (!isGroup && !isOwner && !isChuti && !isButton) {
        const now = Date.now();
        if (!spamCheck[senderNumber]) spamCheck[senderNumber] = { count: 0, lastMsg: now, warned: false };
        const userSpam = spamCheck[senderNumber];
        
        if (now - userSpam.lastMsg < 2500) { 
            userSpam.count++;
            userSpam.lastMsg = now;
            if (userSpam.count >= 4) {
                if (!userSpam.warned) {
                    userSpam.warned = true;
                    await hansaka.sendMessage(from, { text: `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ *S P A M   W A R N I N G* ⚠️\n\nYou are sending messages too rapidly. As an advanced AI, I can process them, but it violates protocol. 🤖🚫\n\nI am ignoring you for the next 10 seconds. Calm down.` });
                }
                return; 
            }
        } else {
            userSpam.count = 1;
            userSpam.lastMsg = now;
            userSpam.warned = false;
        }
    }

    const groupMetadata = isGroup ? await hansaka.groupMetadata(from).catch(() => { }) : '';
    const groupName = isGroup ? groupMetadata.subject : '';
    const participants = isGroup ? groupMetadata.participants : '';
    const groupAdmins = isGroup ? await getGroupAdmins(participants) : '';
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
    const isAdmins = isGroup ? groupAdmins.includes(sender) : false;

    const reply = (text) => hansaka.sendMessage(from, { text }, { quoted: mek });

    const { ytDownloaderState } = require('./lib/state');
    let isSelection = false;
    let selectedCmd = "";
    let selectedQ = q;

    if (!isCmd && /^[0-9]+$/.test(body.trim())) {
        const selection = parseInt(body.trim());
        
        if (ytDownloaderState[senderNumber]) {
            const state = ytDownloaderState[senderNumber];
            selectedQ = state.url;
            isSelection = true;
            const isFb = state.isFb;
            delete ytDownloaderState[senderNumber];

            if (isFb) {
                if (selection === 1) selectedCmd = "fbmp3_internal";
                else if (selection === 2) selectedCmd = "fbmp3_doc_internal";
                else if (selection === 3) selectedCmd = "fbptt_internal";
                else if (selection === 4) selectedCmd = "fbmp4_internal";
                else if (selection === 5) selectedCmd = "fbmp4_doc_internal";
                else isSelection = false;
            } else {
                if (selection === 1) selectedCmd = "ytmp3_internal";
                else if (selection === 2) selectedCmd = "ytmp3_doc_internal";
                else if (selection === 3) selectedCmd = "ytptt_internal";
                else isSelection = false;
            }
        } else {
            // AI Chat එකට බාධා නොවීම සඳහා Global 1, 2 ඉවත් කරන ලදි.
        }
    } 

    // =============================================
    // REPLY HANDLERS - run FIRST before AI/cmd
    // to intercept state-based flows (e.g. anime)
    // =============================================
    const replyText = body;
    let handledByReplyHandler = false;
    for (const handler of replyHandlers) {
      try {
        if (handler.filter(mek, { sender, message: mek })) {
          await handler.function(hansaka, mek, m, {
            from, quoted: mek, body: replyText, sender, senderNumber, reply,
          });
          handledByReplyHandler = true;
          break;
        }
      } catch (e) {
        console.log("Reply handler error:", e);
      }
    }
    if (handledByReplyHandler) return;

    let isAiTrigger = !isCmd && !isSelection && body.trim().length > 0;
    
    // --- AUTO LINK DOWNLOADER INTERCEPTOR ---
    if (isAiTrigger) {
        const linkMatch = body.match(/(https?:\/\/[^\s]+)/);
        if (linkMatch) {
            let url = linkMatch[1];
            let isYt = url.includes('youtube.com') || url.includes('youtu.be');
            let isFb = url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com');

            if (isYt || isFb) {
                ytDownloaderState[senderNumber] = { url: url, isFb: isFb };
                
                let menuMsg = `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n╭───────────────────✨\n│ 🚀 *A U T O  D O W N L O A D E R*\n╰───────────────────✨\n\nI have detected a *${isYt ? "YouTube" : "Facebook"}* Link! 🎬\nPlease select your desired format:`;
                
                let btns = [];
                if (isYt) {
                    btns = [
                        { id: '1', text: '🎵 Audio(Nm)' },
                        { id: '2', text: '📂 Audio(Doc)' },
                        { id: '3', text: '🎤 Audio(VN)' }
                    ];
                } else {
                    btns = [
                        { id: '1', text: '🎵 Audio(Nm)' },
                        { id: '2', text: '📂 Audio(Doc)' },
                        { id: '3', text: '🎤 Audio(VN)' },
                        { id: '4', text: '🎥 Video(Nm)' },
                        { id: '5', text: '📁 Video(Doc)' }
                    ];
                }
                
                isAiTrigger = false;
                const { sendButtons } = require('gifted-btns');
                return await sendButtons(hansaka, from, {
                    text: menuMsg,
                    footer: "> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝",
                    aimode: true,
                    buttons: btns
                });
            }
        }
    }

    let finalCommandName = isCmd ? commandName : (isSelection ? selectedCmd : "aichat");
    let finalQ = isSelection ? selectedQ : q;

    if (isGroup) return; 

    // --- AUTO STICKER REPLY (before AI/registration) ---
    if (!isCmd && !isSelection && body && body.trim().length > 0) {
        try {
            const { handleStickerReply } = require('./plugins/stickers');
            const stickerSent = await handleStickerReply(hansaka, mek, from, body);
            if (stickerSent) return; // Sticker sent — no further processing
        } catch(e) {}
    }


    const { processMessage } = require('./plugins/profile');
    
    // We hand over message processing (Registration + Intent) to profile.js
    let isHandled = await processMessage(hansaka, mek, m, {
        from, senderNumber, body, type, pushname, isOwner, isMe, 
        isCmd, isAiTrigger, isSelection, finalCommandName, finalQ, args, reply
    });

    if (isHandled) return; // Process consumed by profile logic

    if (isCmd || isAiTrigger || isSelection) {
      const cmd = commands.find((c) => c.pattern === finalCommandName || (c.alias && c.alias.includes(finalCommandName)));
      
      if (cmd) {
        await hansaka.sendPresenceUpdate('composing', from);
        
        // Smart Auto-React based on cmd.react or category
        const categoryReacts = {
          'main':    '🤖',
          'ai':      '🧠',
          'utility': '⚙️',
          'owner':   '👑',
          'download':'⬇️',
          'fun':     '🎉',
          'sticker': '🎨',
          'admin':   '🛡️',
          'tool':    '🔧',
        };
        const reactEmoji = cmd.react || categoryReacts[cmd.category] || '✅';
        hansaka.sendMessage(from, { react: { text: reactEmoji, key: mek.key } });

        try {
          cmd.function(hansaka, mek, m, {
            from, quoted: mek, body, isCmd, command: finalCommandName, args, q: finalQ,
            isGroup, sender, senderNumber, botNumber2, botNumber, pushname,
            isMe, isOwner, groupMetadata, groupName, participants, groupAdmins,
            isBotAdmins, isAdmins, reply, prefix
          });
        } catch (e) {
          console.error("[PLUGIN ERROR]", e);
        }
      }
    }

    // Reply handlers already ran above (before AI/cmd processing)

    // Old user welcome logic removed, replaced by Olya AI Registration above.
  });

  // Group welcome logic completely removed for Olya persona.

  hansaka.ev.on('call', async (calls) => {
    for (const call of calls) {
      if (call.status === 'offer') {
        const from = call.from;
        console.log(`📞 Rejecting call from: ${from}`);
        
        await hansaka.rejectCall(call.id, from);
        
        await hansaka.sendMessage(from, { 
          text: `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |

╭───────────────────✨
│ 📵 *C A L L  D E C L I N E D* 📵
╰───────────────────✨
Hello there! I am *Olya*, the Official AI Personal Assistant to *${config.OWNER_NAME}*. 👩‍💻

I sincerely apologize, but as an Artificial Intelligence System, I am *unable to answer voice or video calls*. 🤖🚫

If you have an urgent message or need assistance from *${config.OWNER_NAME}*, please send it as a *Text Message*. ✉️
I will make sure he receives it immediately! 🚀

© All rights reserved by ${config.OWNER_NAME}'s AI Assistant.`,
        });

        try {
            const googleTTS = require("google-tts-api");
            const axios = require('axios');
            const audioUrl = googleTTS.getAudioUrl("සමාවෙන්න! මම Olya, හන්සකගේ Assistant. මට කෝල්ස් ගන්න බැහැ. කරුණාකර සමාන්‍ය Text එකකින් හරි Voice මැසේජ් එකකින් හරි ඔයාගේ අදහස යවන්න.", {
                lang: 'si',
                slow: false,
                host: 'https://translate.google.com',
            });
            const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
            await hansaka.sendMessage(from, { audio: Buffer.from(audioRes.data, 'binary'), mimetype: 'audio/mp4', ptt: true });
        } catch (e) {
            console.log("Voice Note Call Error:", e);
        }
      }
    }
  });
}

ensureSessionFile();

app.get("/", (req, res) => {
  res.send("Hey, Olya Assistant started✅");
});

app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));

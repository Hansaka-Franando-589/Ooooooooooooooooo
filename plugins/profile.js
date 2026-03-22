const fs = require('fs');
const config = require('../config');
const { sendButtons } = require('gifted-btns');
const { cmd } = require('../command');
const axios = require('axios');
const admin = require('firebase-admin');

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
const dbFirebase = admin.apps.length ? admin.firestore() : null;

const DB_FILE = './43.json';

function getDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    try {
        return JSON.parse(data);
    } catch(e) {
        return {};
    }
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function checkIntentAndLanguage(text, expectedLang) {
    try {
        const promptInfo = `You are an intent and language analyzer.
The user is supposed to be speaking in: ${expectedLang === 'si' ? 'Sinhala' : 'English'}.
Analyze the following text: "${text}"

Reply ONLY in strict JSON format. Example:
{
  "isCorrectLanguage": true,
  "intent": "CHANGE_NAME"
}
If the user is asking to change or update their name, intent is "CHANGE_NAME". Otherwise intent is "OTHER". 
isCorrectLanguage is true if the text matches the expected language or if it's very short (like "ok", "yes"), false if they speak entirely in the wrong language (e.g. they should speak English but user text is purely Sinhala).
Do not add markdown formatting or any extra text outside the JSON.`;
        const promptUrl = `https://text.pollinations.ai/${encodeURIComponent(promptInfo)}`;
        const res = await axios.get(promptUrl);
        let output = res.data.trim ? res.data.trim() : res.data;
        if (typeof output === 'string') {
            if (output.startsWith("```json")) output = output.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(output);
        }
        return output; // already parsed object
    } catch (e) {
        console.log("Pollinations Intent Error:", e.message);
        return { isCorrectLanguage: true, intent: "OTHER" }; 
    }
}

async function checkIfValidName(text) {
    try {
        const prompt = `Is the following English or Sinhala text a valid human name or nickname?
Strictly reply ONLY with a JSON object. 
Format: {"isValid": true} or {"isValid": false}. 
User text: "${text}"`;
        const promptUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
        const res = await axios.get(promptUrl);
        let output = res.data.trim ? res.data.trim() : res.data;
        if (typeof output === 'string') {
            if (output.startsWith("```json")) output = output.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(output).isValid;
        }
        return output.isValid;
    } catch(e) {
        console.log("Pollinations ValidName Error:", e.message);
        return true; 
    }
}

async function processMessage(conn, mek, m, opts) {
    const { from, senderNumber, body, type, pushname, isOwner, isMe, isAiTrigger, isCmd, isSelection } = opts;
    
    let text = body || "";
    
    // Load DB
    let db = getDB();
    if (!db[senderNumber] && (isOwner || isMe)) {
        db[senderNumber] = { step: 'REGISTERED', role: 'owner', language: 'si', name: pushname || 'Owner' };
        saveDB(db);
    }
    
    let user = db[senderNumber];
    
    // 1. REGISTRATION FLOW
    if (!user || user.step !== 'REGISTERED') {
        // Exclude system stuff
        if (!user) {
            db[senderNumber] = { step: 'START' };
            saveDB(db);
            let welcomeMsg = `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n╭─────────────────────✨\n│ 🌟 *P R O F I L E   R E Q U I R E D* 🌟\n╰─────────────────────✨\n\n*H E L L O ! 👋*\nI am *Olya*, the exclusive AI Personal Assistant to *${config.OWNER_NAME}*. 👩‍💼💼\n\nඅපගේ සේවාවන් භාවිතා කිරීම සඳහා, කරුණාකර ඔබගේ Profile එකක් නිර්මාණය කරන්න.\nYou must create a profile to continue interacting with me. 📝\n\n_Click the button below to get started! / පහත බොත්තම ඔබා ආරම්භ කරන්න!_ 👇`;
            await sendButtons(conn, from, {
                text: welcomeMsg,
                footer: `© ${config.OWNER_NAME}'s AI Assistant`,
                aimode: true,
                buttons: [{ id: "btn_create_profile", text: "Create Profile" }]
            });
            return true;
        }

        const step = user.step;
        const cleanText = text.trim().toLowerCase();

        if (step === 'START') {
            if (cleanText === 'btn_create_profile' || cleanText === 'create profile') {
                db[senderNumber].step = 'CHOOSE_LANG';
                saveDB(db);
                let langMsg = `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n╭─────────────────────✨\n│ 🌍 *S E L E C T   L A N G U A G E* 🌍\n╰─────────────────────✨\n\nකරුණාකර ඔබගේ භාෂාව තෝරන්න.\nPlease select your preferred language. 👇`;
                await sendButtons(conn, from, {
                    text: langMsg,
                    footer: `© ${config.OWNER_NAME}'s AI Assistant`,
                    aimode: true,
                    buttons: [
                        { id: "btn_lang:en", text: "English" },
                        { id: "btn_lang:si", text: "සිංහල" }
                    ]
                });
            } else {
                 let msg = `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ *අනිවාරෙන් ඉදිරියට යන්න නම් Profile එකක් හදන්න.*\n⚠️ *You must create a profile to continue.*\n\n_Click the button below!_ 👇`;
                 await sendButtons(conn, from, {
                     text: msg,
                     footer: `© ${config.OWNER_NAME}'s AI Assistant`,
                     aimode: true,
                     buttons: [{ id: "btn_create_profile", text: "Create Profile" }]
                 });
            }
            return true;
        }
        else if (step === 'CHOOSE_LANG') {
            if (cleanText === 'btn_lang:en' || cleanText === 'english') {
                db[senderNumber].language = 'en';
                db[senderNumber].step = 'CHOOSE_ROLE';
                saveDB(db);
                
                let roleMsgEn = `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n╭─────────────────────✨\n│ 👤 *S E L E C T   Y O U R   R O L E* 👤\n╰─────────────────────✨\n\nAre you a Normal User or a Prefect? Please select one below: 👇`;
                await sendButtons(conn, from, {
                    text: roleMsgEn,
                    footer: `© ${config.OWNER_NAME}'s AI Assistant`,
                    aimode: true,
                    buttons: [
                        { id: "btn_role:normal", text: "Normal User" },
                        { id: "btn_role:prefect", text: "Prefect" }
                    ]
                });
            } else if (cleanText === 'btn_lang:si' || cleanText === 'සිංහල') {
                db[senderNumber].language = 'si';
                db[senderNumber].step = 'CHOOSE_ROLE';
                saveDB(db);
                
                let roleMsgSi = `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n╭─────────────────────✨\n│ 👤 *ඔබගේ භූමිකාව තෝරන්න* 👤\n╰─────────────────────✨\n\nඔබ සාමාන්‍ය පරිශීලකයෙක්ද නැතහොත් පාසල් ශිෂ්‍ය නායකයෙක්ද (Prefect)? පහතින් තෝරන්න: 👇`;
                await sendButtons(conn, from, {
                    text: roleMsgSi,
                    footer: `© ${config.OWNER_NAME}'s AI Assistant`,
                    aimode: true,
                    buttons: [
                        { id: "btn_role:normal", text: "සාමාන්‍ය" },
                        { id: "btn_role:prefect", text: "Prefect" }
                    ]
                });
            } else {
                await opts.reply(db[senderNumber]?.language === 'en' ? "⚠️ Please select a language from the buttons! / කරුණාකර බොත්තම් මගින් භාෂාව තෝරන්න! 👇" : "⚠️ කරුණාකර බොත්තම් මගින් භාෂාව තෝරන්න! / Please select a language from the buttons! 👇");
            }
            return true;
        }
        else if (step === 'CHOOSE_ROLE') {
            if (cleanText === 'btn_role:normal' || cleanText === 'normal user' || cleanText === 'සාමාන්‍ය') {
                db[senderNumber].role = 'normal';
                db[senderNumber].step = 'WAITING_NAME_NORMAL';
                saveDB(db);
                await opts.reply(db[senderNumber].language === 'en' ? "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n📝 Please enter your full name:" : "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n📝 කරුණාකර ඔබගේ සම්පූර්ණ නම ඇතුලත් කරන්න (Type කරන්න):");
            } else if (cleanText === 'btn_role:prefect' || cleanText === 'prefect') {
                db[senderNumber].role = 'prefect';
                db[senderNumber].step = 'WAITING_PREFECT_INDEX';
                saveDB(db);
                await opts.reply(db[senderNumber].language === 'en' 
                    ? "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n🛡️ As a Prefect, you must securely verify your identity.\nPlease enter your **Index Number** (e.g., 1308-xxxxx):" 
                    : "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n🛡️ ශිෂ්‍ය නායකයෙකු ලෙස ඉදිරියට යෑමට ඔබව තහවුරු කළ යුතුය.\nකරුණාකර ඔබගේ **ඇතුළත් වීමේ අංකය (Index Number)** දැන්ම ලබාදෙන්න:");
            }
            return true;
        }
        else if (step === 'WAITING_NAME_NORMAL') {
            if (!text) return true; // ignore media
            const isValidName = await checkIfValidName(text);
            if (!isValidName) {
                await opts.reply(db[senderNumber].language === 'en' ? "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ *Invalid Name!*\nPlease enter a real human name." : "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ *වැරදි නමක්!*\n 🙏 කරුණාකර නිවැරදි මිනිස් නමක් පමණක් ඇතුලත් කරන්න.");
                return true;
            }
            db[senderNumber].name = text;
            db[senderNumber].step = 'WAITING_PHONE_NORMAL';
            saveDB(db);
            await opts.reply(db[senderNumber].language === 'en' ? "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n📞 What is your phone number?" : "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n📞 කරුණාකර ඔබගේ දුරකථන අංකය ඇතුලත් කරන්න:");
            return true;
        }
        else if (step === 'WAITING_PHONE_NORMAL') {
            if (!text) return true;
            db[senderNumber].phone = text;
            db[senderNumber].step = 'REGISTERED';
            saveDB(db);
            
            let name = db[senderNumber].name;
            let successMsg = db[senderNumber].language === 'en' 
                ? `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n╭─────────────────────✨\n│ 🎉 *R E G I S T R A T I O N   S U C C E S S F U L* 🎉\n╰─────────────────────✨\n\nWelcome, *${name}*! 🌸\nYou are now successfully registered in my system. ✅\n\nI am ready to assist you on behalf of *${config.OWNER_NAME}*. How can I help you today? 🤝`
                : `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n╭─────────────────────✨\n│ 🎉 *ලියාපදිංචිය සාර්ථකයි!* 🎉\n╰─────────────────────✨\n\nසාදරයෙන් පිළිගනිමු, *${name}*! 🌸\nඔබගේ දත්ත සාර්ථකව මගේ පද්ධතියේ සටහන් විය. ✅\n\n${config.OWNER_NAME} වෙනුවෙන් මම දැන් ඔබට සහාය වීමට ලෑස්තියි. ඔබට මාගෙන් කෙරෙන්න ඕනේ මොනාද? 🤝`;
            
            await sendButtons(conn, from, {
                text: successMsg,
                footer: `© ${config.OWNER_NAME}'s AI Assistant`,
                aimode: true,
                buttons: [{ id: "btn_action_menu", text: db[senderNumber].language === 'en' ? "Main Menu" : "ප්‍රධාන මෙනුව" }]
            });
            return true;
        }
        else if (step === 'WAITING_PREFECT_INDEX') {
            if (!text) return true;
            if (!dbFirebase) {
                await opts.reply(db[senderNumber].language === 'en' ? "⚠️ Database offline! Please try again later." : "⚠️ පද්ධතිය ක්‍රියා විරහිතයි! පසුව උත්සාහ කරන්න.");
                return true;
            }

            let snapshot = await dbFirebase.collection('prefects').where('school_index_number', '==', text.trim()).get();
            if (snapshot.empty) {
                await opts.reply(db[senderNumber].language === 'en' 
                    ? "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n❌ *Identity Not Found!*\nThere is no Prefect registered with this Index Number. Please enter the correct Index Number." 
                    : "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n❌ *අසාර්ථකයි!*\nමෙම ඇතුළත් වීමේ අංකයෙන් (Index Number) ලියාපදිංචි වී ඇති ශිෂ්‍ය නායකයෙකු නොමැත. නිවැරදි අංකය ලබාදෙන්න.");
                return true;
            }

            const docData = snapshot.docs[0].data();
            db[senderNumber].temp_index = text.trim();
            db[senderNumber].temp_name = docData.name;
            db[senderNumber].temp_prefect_id = docData.prefect_unique_id;
            db[senderNumber].step = 'WAITING_PREFECT_ID';
            saveDB(db);

            await opts.reply(db[senderNumber].language === 'en' 
                ? `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n✅ Index Found: *${docData.name}*\n\nFor security verification, please enter your **Prefect ID**:` 
                : `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n✅ දත්ත තහවුරුයි: *${docData.name}*\n\nඅනන්‍යතාව සම්පූර්ණයෙන් තහවුරු කිරීමට කරුණාකර ඔබගේ **Prefect ID** අංකය ඇතුලත් කරන්න:`);
            return true;
        }
        else if (step === 'WAITING_PREFECT_ID') {
            if (!text) return true;
            
            const expectedId = String(db[senderNumber].temp_prefect_id || '').trim().toLowerCase();
            const inputId = text.trim().toLowerCase();

            if (inputId !== expectedId) {
                await opts.reply(db[senderNumber].language === 'en' 
                    ? "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n❌ *Incorrect Prefect ID!*\nThe ID provided does not match. Please enter the correct Prefect ID." 
                    : "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n❌ *වැරදි Prefect ID එකකි!*\nඔබ ඇතුළත් කළ අංකය නොගැලපේ. කරුණාකර නිවැරදි Prefect ID අංකය ඇතුලත් කරන්න.");
                return true;
            }

            db[senderNumber].name = db[senderNumber].temp_name || "Prefect";
            db[senderNumber].id_number = db[senderNumber].temp_index;
            
            delete db[senderNumber].temp_index;
            delete db[senderNumber].temp_name;
            delete db[senderNumber].temp_prefect_id;
            
            db[senderNumber].step = 'REGISTERED';
            saveDB(db);
            
            let name = db[senderNumber].name;
            let successMsgPrefect = db[senderNumber].language === 'en' 
                ? `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n╭─────────────────────✨\n│ 🎉 *P R E F E C T   V E R I F I E D* 🎉\n╰─────────────────────✨\n\n✅ Identity Verified Securely!\n🆔 Index Number: *${db[senderNumber].id_number}*\n\nWelcome Prefect *${name}*! 🌸\nYou are now successfully registered in my system. ✅\n\nI am ready to assist you! 🤝`
                : `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n╭─────────────────────✨\n│ 🎉 *ප්‍රිෆෙක්ට් තහවුරු කිරීම සාර්ථකයි!* 🎉\n╰─────────────────────✨\n\n✅ අනන්‍යතාව සම්පූර්ණයෙන් තහවුරු විය!\n🆔 Index අංකය: *${db[senderNumber].id_number}*\n\nසාදරයෙන් පිළිගනිමු ශිෂ්‍ය නායක *${name}*! 🌸\nඔබගේ දත්ත සාර්ථකව මගේ පද්ධතියේ සටහන් විය. ✅\n\nප්‍රිෆෙක්ට් කටයුතු සඳහා මම දැන් ඔබට සහාය වීමට ලෑස්තියි! 🤝`;
            
            await sendButtons(conn, from, {
                text: successMsgPrefect,
                footer: `© ${config.OWNER_NAME}'s AI Assistant`,
                aimode: true,
                buttons: [{ id: "btn_action_menu", text: db[senderNumber].language === 'en' ? "Main Menu" : "ප්‍රධාන මෙනුව" }]
            });
            return true;
        }
    }
    
    // 2. AI INTENT & LANGUAGE CHECK FOR REGISTERED USERS
    if (user.step === 'REGISTERED' && isAiTrigger && text) {
        
        // Skip explicitly button-clicks
        if (text.startsWith("btn_")) return false; 
        
        const aiInfo = await checkIntentAndLanguage(text, user.language);
        
        if (!aiInfo.isCorrectLanguage) {
            await opts.reply(user.language === 'en' ? "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ *Language Mismatch!*\nPlease communicate in your selected language (English)." : "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ *වෙනත් භාෂාවක්!*\nකරුණාකර ඔබ තෝරාගත් භාෂාවෙන් (සිංහල) පමණක් මා සමඟ කතා කරන්න.");
            return true; // handled
        }
        
        if (aiInfo.intent === 'CHANGE_NAME') {
            let msg = user.language === 'en' 
                ? "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n╭─────────────────────✨\n│ ✏️ *U P D A T E   P R O F I L E*\n╰─────────────────────✨\n\nYou requested to change your name. Click below:" 
                : "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n╭─────────────────────✨\n│ ✏️ *නම වෙනස් කිරීම*\n╰─────────────────────✨\n\nඔබට නම වෙනස් කිරීමට අවශ්‍ය නම් පහතින් click කරන්න:";
            await sendButtons(conn, from, {
                text: msg,
                footer: `© ${config.OWNER_NAME}'s AI Assistant`,
                aimode: true,
                buttons: [{ id: "btn_action_changename", text: user.language === 'en' ? "Update Name" : "නම වෙනස් කරන්න" }]
            });
            return true; 
        }
    }
    
    // 3. Handle specific action buttons for registered users
    if (user.step === 'REGISTERED' && text === 'btn_action_changename') {
         db[senderNumber].step = 'WAITING_NEW_NAME';
         saveDB(db);
         await opts.reply(user.language === 'en' ? "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n📝 Please enter your NEW name:" : "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n📝 කරුණාකර ඔබගේ අලුත් නම ඇතුලත් කරන්න:");
         return true;
    }
    if (user.step === 'WAITING_NEW_NAME') {
         if (!text) return true;
         const isValidName = await checkIfValidName(text);
         if (!isValidName) {
             await opts.reply(user.language === 'en' ? "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ *Invalid Name!*\nPlease enter a real human name." : "💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ *වැරදි නමක්!*\n 🙏 කරුණාකර නිවැරදි මිනිස් නමක් පමණක් ඇතුලත් කරන්න.");
             return true;
         }
         db[senderNumber].name = text;
         db[senderNumber].step = 'REGISTERED';
         saveDB(db);
         await opts.reply(user.language === 'en' ? `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n✅ Your name has been successfully updated to *${text}*!` : `💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n✅ ඔබගේ නම *${text}* ලෙස සාර්ථකව යාවත්කාලීන විය!`);
         return true;
    }

    return false; // Not consumed here, let commands handle it
}

// .db command for Owner
cmd({
    pattern: "db",
    desc: "View user database",
    category: "owner",
    react: "📁",
    filename: __filename
},
async (conn, mek, m, { isOwner, isMe, reply }) => {
    if (!isOwner && !isMe) {
        return reply("💙 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝 |\n\n⚠️ *Access Denied!*\nඔබ හට මෙම විධානය භාවිතා කිරීමට විශේෂ අවසරයක් නොමැත.");
    }
    let db = getDB();
    let dataStr = JSON.stringify(db, null, 2);
    reply("```json\n" + dataStr + "\n```");
});

module.exports = {
    processMessage,
    getDB
};

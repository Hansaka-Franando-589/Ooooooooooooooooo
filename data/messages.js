// ============================================================
// OLYA BOT - PRE-WRITTEN SINHALA TEMPLATE MESSAGES
// DECORATED ROBOTIC THEME 🤖 ✨
// ============================================================
// AI use කරන්නේ intent detect කිරීමට පමණයි.
// getTemplate('key') → random template pick + footer auto-append.
// ============================================================

const FOOTER = "\n> 𝓐𝓼𝓼𝓲𝓼𝓽𝓪𝓷𝓽 𝓞𝓵𝔂𝓪 💞🐝";

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to wrap the text in a beautiful border
const dec = (title, body) => {
    return `✦ ━━━━━━━━━━━━━━━ ✦\n${title}\n\n${body}\n✦ ━━━━━━━━━━━━━━━ ✦`;
};

const templates = {

    // ══════════════════════════════════════════════════════
    // 👋 GREETING / HELLO
    // ══════════════════════════════════════════════════════
    greeting: [
        dec("🤖 *Olya AI System*", "🟢 System Online. මම Olya, Cybernetic AI Assistant.\nECCPMS Report Data ලබාගැනීම සඳහා 'report' යන Command එක ඇතුළත් කරන්න."),
        dec("📡 *Connection Established*", "⚙️ Olya AI Module සක්‍රීයයි.\nReport ලබාගැනීමට 'report' යන්න Type කරන්න."),
        dec("🟢 *Olya Protocols Active*", "🤖 ඔබට ECCPMS පද්ධතියට ප්‍රවේශ වීමට අවශ්‍ය නම්, Command Line එකේ 'report' ලෙස ලබාදෙන්න."),
        dec("🤖 *System Check Complete*", "⚙️ මම Olya!\nReports ලබාගැනීමට 'report' Command එක Initiate කරන්න."),
        dec("🟢 *AI Assistant Online*", "📡 පද්ධති ප්‍රවේශය සූදානම්.\nMonthly Report ලබාගැනීමට 'report' ලෙස Type කරන්න."),
        dec("⚙️ *Server Connected*", "🤖 මම Olya.\nReport එක ලබාගැනීම සඳහා 'report' විධානය ක්‍රියාත්මක කරන්න."),
    ],

    // ══════════════════════════════════════════════════════
    // 📋 REPORT REQUEST — GENERAL USER
    // ══════════════════════════════════════════════════════
    report_request_general: [
        dec("📥 *Command Received*", "⚡ ECCPMS System එකට Access ලබාගැනීම ආරම්භ කරමි.\nකරුණාකර ඔබගේ *Index Number* (අධ්‍යයන අංකය) Input කරන්න."),
        dec("⚙️ *Processing Request*", "🤖 Report System Engine ක්‍රියාත්මකයි.\nදත්ත ගබඩාවෙන් සෙවීමට ඔබගේ *Index Number* එක ලබාදෙන්න."),
        dec("📡 *System Connecting...*", "කරුණාකර දත්ත සත්‍යාපනය සඳහා ඔබගේ *Index Number* (අධ්‍යයන අංකය) ඇතුළත් කරන්න."),
        dec("🤖 *Report Compiler Ready*", "⚡ Data Extract කිරීම අරඹන්න, ඔබගේ *Index Number* එක Command එකක් ලෙස එවන්න."),
        dec("✅ *Process Initiated*", "⚙️ දත්ත සමුදායට ඇතුල් වීම සඳහා ඔබගේ *Index Number* එක Input කරන්න."),
        dec("🟢 *System Authorized*", "කරුණාකර ඔබගේ Record එක හඳුනාගැනීම සඳහා *Index Number* අංකය ලබාදෙන්න."),
    ],

    // ══════════════════════════════════════════════════════
    // 📋 REPORT REQUEST — VIP (Chooti Miss)
    // ══════════════════════════════════════════════════════
    report_request_vip: [
        dec("🔴 *System Alert*", "⚡ VIP User තහවුරු විය.\nමිස්, ECCPMS Data Processing සඳහා ඔයාගේ *Index Number* එක ලබාදෙන්න."),
        dec("🟢 *VIP Access Granted*", "⚙️ මිස්, Report Data Extract කිරීමට *Index Number* එක Input කරන්න."),
        dec("🤖 *Olya Processor Ready*", "⚡ මිස්ගේ Report එක සකස් කිරීමට දත්ත ගබඩාවට ප්‍රවේශ වීමට *Index Number* එක අවශ්‍යයි."),
        dec("✅ *Priority Command Accepted*", "⚙️ මිස්, කරුණාකර *Index Number* එක ඇතුළත් කරන්න."),
        dec("📡 *System Override*", "🤖 VIP Mode Active. *Index Number* අංකය ලබා දුන් සැනින් Report එක Render කර දෙන්නම්."),
        dec("🟢 *Admin Level Welcome*", "⚙️ මිස්, කරුණාකර *Index Number* එක ලබාදෙන්න."),
    ],

    // ══════════════════════════════════════════════════════
    // 🔐 ASK PREFECT ID — GENERAL USER (after index found)
    // ══════════════════════════════════════════════════════
    ask_prefect_id_general: [
        dec("✅ *Index Data Verified*", "🔐 Security Protocol Active.\nදෙවන අදියරේ සත්‍යාපනය සඳහා ඔබගේ *Prefect ID* එක ඇතුළත් කරන්න."),
        dec("🟢 *Data Match Successful*", "⚡ Firewall Security Check:\nකරුණාකර ඔබගේ *Prefect ID* එක Input කරන්න."),
        dec("✅ *System Scan: Index Valid*", "🤖 Identity Verify කිරීමට *Prefect ID* අංකය ලබාදෙන්න."),
        dec("🔐 *Layer 2 Security Initiated*", "ඔබගේ අනන්‍යතාවය තහවුරු කිරීමට *Prefect ID* එක ඇතුළත් කරන්න."),
        dec("📡 *Connection Secure*", "⚙️ Data Extraction එකට පෙර, කරුණාකර *Prefect ID* එක ඇතුළත් කර අවසර ලබාගන්න."),
        dec("🤖 *Authentication Check*", "ඔබගේ *Prefect ID* Number එක සපයන්න."),
    ],

    // ══════════════════════════════════════════════════════
    // 🔐 ASK PREFECT ID — VIP
    // ══════════════════════════════════════════════════════
    ask_prefect_id_vip: [
        dec("🟢 *VIP Index Match Successful*", "🔐 Security Step 2:\nමිස්, ඔබගේ *Prefect ID* අංකය ලබාදෙන්න."),
        dec("✅ *Data Processed*", "⚡ System Security කඩිනම් කිරීම සඳහා *Prefect ID* එක ලබාදෙන්න."),
        dec("🔐 *Authentication Level 2*", "🤖 මිස්, ඔබගේ *Prefect ID* එක Input කරන්න."),
        dec("⚙️ *VIP Access Protocol*", "කරුණාකර *Prefect ID* එක Validation සඳහා ලබාදෙන්න."),
        dec("🟢 *Index Confirmed*", "🤖 මිස්ගේ *Prefect ID* Verification ලබා දෙන්න."),
        dec("📡 *Security Log Active*", "🔐 මිස්, *Prefect ID* එක ඇතුළත් කර Protocol සම්පූර්ණ කරන්න."),
    ],

    // ══════════════════════════════════════════════════════
    // 📷 ASK BARCODE PHOTO — GENERAL USER
    // ══════════════════════════════════════════════════════
    ask_barcode_general: [
        dec("🟢 *ID Authentication Successful*", "📸 Visual Verification අවශ්‍යයි.\nකරුණාකර ඔබගේ *Barcode Card* ඡායාරූපයක් (Image) System එකට Upload කරන්න."),
        dec("✅ *Layer 2 Validated*", "👁️ Olya Vision Core ක්‍රියාත්මකයි.\nකරුණාකර *Barcode Card* එකේ පැහැදිලි ඡායාරූපයක් ලබාදෙන්න."),
        dec("🔐 *Security Step 3*", "📸 Barcode Data Scan කිරීමට අදාළ ඡායාරූපය Upload කරන්න."),
        dec("⚙️ *ID Verified*", "⚡ පද්ධති පිවිසුම සම්පූර්ණ කිරීමට *Barcode Photo* එක System එකට එවන්න."),
        dec("✅ *Authorized*", "📸 Olya AI Vision ක්‍රියාත්මක වෙමින් පවතී. Barcode අඩංගු *Image File* එකක් Provide කරන්න."),
        dec("🟢 *Security Clearance Final*", "🤖 Barcode Card එක Frame කර Photo එකක් ලබාදෙන්න."),
    ],

    // ══════════════════════════════════════════════════════
    // 📷 ASK BARCODE PHOTO — VIP
    // ══════════════════════════════════════════════════════
    ask_barcode_vip: [
        dec("🟢 *VIP ID Verified*", "📷 Visual Recognition Protocol ක්‍රියාත්මකයි.\nමිස්, *Barcode Photo* එක ලබා දෙන්න."),
        dec("🔐 *Security Access Granted*", "👁️ මිස්, අවසන් පියවර සඳහා ඔබගේ *Barcode Image* එක Upload කරන්න."),
        dec("✅ *System Log Verified*", "📸 Olya Vision Core Readiness!\nමිස්ගේ පින්තූරය (Barcode Photo) එවන්න."),
        dec("⚙️ *Authorization Complete*", "🤖 මිස්, Barcode Validation එක සඳහා ඡායාරූපයක් ලබා දෙන්න."),
        dec("🟢 *VIP Identity Clear*", "📷 Scan Process එකට *Barcode Photo* එක එවන්න."),
        dec("✅ *Data Matching Successful*", "📸 මිස්, Barcode Photo Capture එක System එකට Upload කරන්න."),
    ],

    // ══════════════════════════════════════════════════════
    // 📅 ASK MONTH — GENERAL USER (after barcode verified)
    // ══════════════════════════════════════════════════════
    ask_month_general: [
        dec("✅ *Barcode Vision Scan Success*", "🗓️ Data අනුමත විය.\nඔබට Report එක අවශ්‍ය මාසයේ අංකය (1,2,3,4) Input කරන්න."),
        dec("🟢 *Authentication Complete*", "🤖 Report Module Loaded.\nඅවශ්‍ය Report මාසයේ Index එක (1 සිට 4 දක්වා) මෙහි ඇතුළත් කරන්න."),
        dec("✅ *Visual Data Verified*", "⚡ System Ready for Report Compilation.\nමාසය සඳහා අංකය (1-4) ලබාදෙන්න."),
        dec("🔐 *Access Granted*", "🤖 Data Extraction ක්‍රියාවලිය සඳහා Report Month එක (1, 2, 3, 4) තෝරන්න."),
        dec("⚙️ *Barcode Decoded Successfully*", "🗓️ කරුණාකර අදාළ Report මාසය අංකයකින් Input කරන්න (1 Latest Month)."),
        dec("🟢 *Identity Authorization Full*", "⚡ Report Month අංකය ලබා දී Data Request එක Finish කරන්න."),
    ],

    // ══════════════════════════════════════════════════════
    // 📅 ASK MONTH — VIP
    // ══════════════════════════════════════════════════════
    ask_month_vip: [
        dec("✅ *Scan Completed*", "🤖 Barcode Verified.\nමිස්, Report Data Extract කිරීමට අවශ්‍ය මාසයේ අංකය (1, 2, 3 හෝ 4) ලබාදෙන්න."),
        dec("👁️ *Olya Vision Scan Success*", "🗓️ මිස්, Report Month Number එක Input කරන්න."),
        dec("🟢 *VIP Authentication Completed*", "⚙️ PDF Compiler සූදානම්.\nඅවශ්‍ය මාසය (1-4) තෝරන්න."),
        dec("🔐 *Access Complete*", "🤖 මිස්, Report Compiler එකට අවශ්‍ය මාසයේ අංකය Select කරන්න."),
        dec("✅ *Barcode Accepted*", "🗓️ මාසය සඳහා අංකයක් ද ලබාදෙන්න. 1-4 අගයක් බලාපොරොත්තු වේ."),
        dec("🟢 *System Validation 100%*", "🤖 මිස්, Olya Report System එකට මාසය ලබාදෙන්න (1, 2, 3, 4)."),
    ],

    // ══════════════════════════════════════════════════════
    // ❌ WRONG PREFECT ID
    // ══════════════════════════════════════════════════════
    wrong_id: [
        dec("🔴 *Error: ID Mismatch*", "දත්ත වල නොගැලපීමක් ඇත. නිවැරදි ID එක Input කරන්න.\nOperation එක අවලංගු කිරීමට 'EXIT' Type කරන්න."),
        dec("🔴 *Authentication Failed*", "⚙️ ඇතුළත් කළ Prefect ID අගය දත්ත ගබඩාව සමඟ නොගැලපේ.\nනිවැරදි කර නැවත එවන්න. Cancel: 'EXIT'."),
        dec("🔴 *Security Breach Risk*", "🤖 වැරදි ID එකක් ලබා දී ඇත. Retry කරන්න හෝ Process එක නවත්වන්න 'EXIT' විධානය දෙන්න."),
        dec("⚠️ *System Warning: Input Error*", "ID Data නොගැලපේ. කරුණාකර නිවැරදි ID එක නැවත ලබාදෙන්න (Cancel කිරීමට EXIT)."),
        dec("🔴 *Protocol Denied*", "⚙️ Prefect ID Validation අසාර්ථක විය. නිවැරදි කර නැවත අත්හදා බලන්න."),
        dec("⚠️ *Identity Error*", "🤖 ඇතුළත් කළ ID අංකය හඳුනාගැනීම ප්‍රතික්ෂේප විය. නිවැරදි ID එක Provide කරන්න (EXIT)."),
    ],

    // ══════════════════════════════════════════════════════
    // ❌ INVALID MONTH NUMBER
    // ══════════════════════════════════════════════════════
    invalid_month: [
        dec("🔴 *Error: Invalid Input Format*", "⚙️ මාසය සඳහා 1, 2, 3 හෝ 4 අංක පමණක් Support කරයි.\nනැවත Input කරන්න."),
        dec("⚠️ *Syntax Error*", "🤖 ලබාදුන් අංකය පද්ධති කේතයෙන් පිටතයි.\n(1-4) පරාසයක අගයක් ලබාදෙන්න."),
        dec("🔴 *Value Not Found*", "⚡ අදාළ මාසයේ අංකය වැරදියි. 1 සිට 4 දක්වා අංකයක් පමණක් Input කරන්න."),
        dec("⚠️ *Data Format Warning*", "⚙️ Report Index Array එකට අදාළව (1, 2, 3, 4) පමණක් විධානය ලෙස දෙන්න."),
        dec("🔴 *Compiler Error*", "🤖 වැරදි මාස අංකයක් ලබා දී ඇත. කරුණාකර 1-4 අතර Number එකක් තෝරන්න."),
        dec("⚠️ *Invalid Input*", "⚙️ මාසයේ අංකය හඳුනාගැනීමට අපහසුයි. කරුණාකර නිවැරදි අංකයක් ලබාදෙන්න."),
    ],

    // ══════════════════════════════════════════════════════
    // ✅ EXIT / CANCEL
    // ══════════════════════════════════════════════════════
    exit_cancel: [
        dec("🛑 *Execution Terminated*", "🟢 Task Cancelled. System එක නැවත Default Mode එකට යාවත්කාලීන විය."),
        dec("🛑 *Operation Aborted*", "⚙️ සම්පූර්ණ ක්‍රියාවලිය නවතා දමන ලදී. Olya AI System ආපසු Standby Mode වෙත මාරු විය."),
        dec("✅ *Process Cancelled*", "🤖 අදාළ Command Sequence එක අවලංගු කරන ලදී.\nMain Loop Active 🟢."),
        dec("🛑 *Request Dropped*", "⚙️ System Buffer Clear කරන ලදී.\nනැවත Report එකක් Initiate කිරීමට 'report' Output කරන්න."),
        dec("🟢 *Task Termination Successful*", "🤖 අපි දැන් නැවත Normal Function Mode එකේ සිටිමු."),
        dec("🛑 *System Override: Cancel Complete*", "⚙️ User Interface Reset කර ඇත."),
    ],

    // ══════════════════════════════════════════════════════
    // ⚡ URGENT — VIP ONLY
    // ══════════════════════════════════════════════════════
    urgent_vip: [
        dec("🚨 *Emergency Protocol Activated*", "⚡ High-Priority Alert එකක් මගේ නිර්මාතෘ හන්සක වෙත සම්ප්‍රේෂණය කරමින් පවතී...\nකරුණාකර රැඳී සිටින්න."),
        dec("🔴 *System Override*", "🤖 Urgent Ping සම්ප්‍රේෂණය විය! හන්සකගේ Device එකට Priority Notification ලබා දුනි."),
        dec("✅ *Priority Alert Sent*", "⚡ හන්සකගේ Main Server එකට Emergency Signal එක යවා ඇත.\nඉක්මන් සම්බන්ධ වීමක් බලාපොරොත්තු වන්න."),
        dec("🚨 *Action Status: URGENT*", "⚙️ Communication Line එකක් හන්සක වෙත කඩිනමින් විවෘත කළා. Stand by..."),
        dec("🔴 *Code Red Command Executed*", "⚡ Alert එක හන්සකගේ Terminal එකට යැව්වා. Waiting for response..."),
        dec("🚨 *Emergency Ping Delivered*", "🤖 හන්සකට සෘජුවම දැනුම් දී ඇත."),
    ],

    // ══════════════════════════════════════════════════════
    // ⏳ BUSY MODE — GENERAL USER
    // ══════════════════════════════════════════════════════
    busy_mode_general: [
        dec("🟡 *System Notice*", "🤖 හන්සක දැනට Offline/Busy තත්වයේ සිටී. දත්ත (Data log) මගින් සටහන් කරගත්තා. පසුව ප්‍රතිචාර දක්වනු ඇත."),
        dec("🟡 *Admin Status: DND*", "⚙️ ඔබගේ පණිවිඩය Cache එකේ සුරක්ෂිත කළා. හන්සක Online වූ පසු සම්බන්ධ වේවි."),
        dec("🤖 *System Auto-Reply*", "📡 හන්සකගේ Available Status = False.\nData Packet එක Note කරගත්තා."),
        dec("🔴 *Admin Offline*", "🤖 Communication Port වසා ඇත. ඔබගේ පණිවිඩය Data Log එකේ රඳවාගත්තා."),
        dec("🟡 *Network Notice*", "⚙️ හන්සක දැනට කාර්යබහුලයි. පද්ධතියට ලැබුණු පණිවිඩය පසුව ලබාදීමට සුරක්ෂිත කළා."),
        dec("🟡 *Status Update*", "🤖 හන්සක Unavailable. Server එකේ Record අගය සටහන් විය."),
    ],

    // ══════════════════════════════════════════════════════
    // ⏳ BUSY MODE — VIP
    // ══════════════════════════════════════════════════════
    busy_mode_vip: [
        dec("🟡 *Priority Warning*", "🤖 මිස්, හන්සක දැනට කාර්යබහුලයි (System Busy).\nඔබගේ පණිවිඩය High Priority Log එකේ සටහන් කරගත්තා. ඉක්මනින් සම්බන්ධ වේවි ⚡."),
        dec("🟡 *VIP Note*", "⚙️ Admin Status = Busy.\nමිස්ගේ පණිවිඩය වෙනම Server Log එකක Save කරගත්තා. මම Notify කරන්නම් 🤖."),
        dec("🟡 *Warning Level 1*", "📡 හන්සක දැනට Offline. මිස්, Data Log එක Update කළා.\nAvailable වූ වහාම Ping කරයි."),
        dec("🤖 *System Intercept*", "⚡ හන්සක Busy.\nමිස්ගේ මැසේජ් එක Priority Buffer එකේ රඳවාගත්තා."),
        dec("🟡 *Notice: DND Mode*", "🤖 පණිවිඩය සුරක්ෂිතයි. පසුව Connect කරල දෙන්නම් මිස්."),
        dec("🟡 *Admin Status: Busy*", "⚙️ මිස්, Message එක Priority Tag එකක් සමඟ Save කරගත්තා."),
    ],

    // ══════════════════════════════════════════════════════
    // 🔴 SYSTEM OFFLINE (Firebase unavailable)
    // ══════════════════════════════════════════════════════
    system_offline: [
        dec("🔴 *System Offline*", "⚙️ ECCPMS සේවාදායකය (Server) සමඟ Connection බිඳවැටී ඇත.\nකරුණාකර පසු අවස්ථාවක නැවත උත්සාහ කරන්න."),
        dec("🔴 *Database Error*", "🤖 Firebase Cloud සමඟ සන්නිවේදනය කිරීම අසාර්ථකයි.\nපද්ධතිය Offline තත්වයේ පවතී."),
        dec("🔴 *Network Failure*", "📡 ECCPMS දත්ත ගබඩාව වෙත Access ලබාගත නොහැක.\nReconnection ක්‍රියාවලිය සඳහා රැඳී සිටින්න ⚙️."),
        dec("🔴 *Fatal Server Error*", "🤖 ECCPMS Connection Lost. කරුණාකර පසුව Command එකක් ලබාදෙන්න."),
        dec("🔴 *Connection Timeout*", "⚙️ දත්ත සමුදාය සම්පූර්ණයෙන්ම Offline. පද්ධති ප්‍රතිසංස්කරණය වන තුරු රැඳී සිටින්න."),
        dec("🔴 *Cloud Sync Failed*", "🤖 ECCPMS Database බිඳවැටීමකට ලක්වී ඇත. නැවත උත්සාහ කරන්න."),
    ],

    // ══════════════════════════════════════════════════════
    // ⚠️ BARCODE UNREADABLE
    // ══════════════════════════════════════════════════════
    barcode_unreadable: [
        dec("🔴 *Vision API Error*", "📸 Barcode එක කියවීමට අපහසුයි. අඳුරු බව/බොඳ වීම නිසා Scan ක්‍රියාවලිය අසාර්ථකයි.\nකරුණාකර නැවත Upload කරන්න ⚙️."),
        dec("🔴 *Olya Scanner Error*", "🤖 Data Matrix එක හඳුනාගැනීම අසාර්ථකයි.\nවඩාත් හොඳ Resolution එකක් සහිත Image එකක් ලබාදෙන්න."),
        dec("⚠️ *Decode Failed*", "📸 බාර්කෝඩ් සංකේතය System එකට Capture වුණේ නැහැ. කරුණාකර Clear Photo එකක් Submit කරන්න."),
        dec("🔴 *Pixel Match Error*", "👁️ Image Quality දුර්වලයි. Barcode Data අහිමි වී ඇත. Image එක Check කර නැවත එවන්න 🤖."),
        dec("⚠️ *Vision Processing Failed*", "📸 බාර්කෝඩ් Area එක පැහැදිලි නැත. නැවත Camera එක Focus කර ඡායාරූපයක් එවන්න ⚙️."),
        dec("🔴 *Image Extraction Error*", "🤖 Barcode අංක කියවීමට නොහැක. නැවත උත්සාහ කරන්න."),
    ],

    // ══════════════════════════════════════════════════════
    // 📷 BARCODE PHOTO NOT SENT (text sent instead)
    // ══════════════════════════════════════════════════════
    barcode_photo_needed: [
        dec("🔴 *Format Error*", "🛑 Text Inputs භාරගන්නේ නැත.\nVisual Data (ඡායාරූපයක්) පමණක් Upload කරන්න. Cancel කිරීමට 'EXIT' Command එක දෙන්න."),
        dec("⚠️ *Data Type Mismatch*", "📸 System එක බලාපොරොත්තු වන්නේ Image File (.jpg/.png) එකකි. අකුරු ලබාදීමෙන් වලකින්න 🤖."),
        dec("🔴 *Syntax Error*", "⚙️ ඡායාරූප (Photos) සඳහා පමණක් Protocol එක සකසා ඇත. කරුණාකර Text Input එක ඉවත් කරන්න."),
        dec("⚠️ *Input Rejected*", "🛑 Barcode Card එකේ ඡායාරූපයක් (Photo) පමණක් අවශ්‍යයි. Cancel: 'EXIT'."),
        dec("🔴 *File Type Error*", "📸 පණිවිඩ ආකෘතිය වැරදියි. ඡායාරූපයක් පමණක් Output කරන්න 🤖."),
        dec("⚠️ *Warning: Image Capture Ready*", "⚙️ Text Commands අනුමත නොකෙරේ. Photo එකක් Upload කරන්න."),
    ],

    // ══════════════════════════════════════════════════════
    // ⚠️ REPORT PDF ERROR
    // ══════════════════════════════════════════════════════
    report_error: [
        dec("🔴 *PDF Compilation Error*", "⚙️ දත්ත සැකසීමේදී Compiler දෝෂයක් හටගත්තා. Request Aborted. කරුණාකර යළි උත්සාහ කරන්න."),
        dec("🔴 *Render Failed*", "🤖 Document Engine එකෙහි ක්‍රියාකාරිත්වය අසාර්ථක විය.\nTask විනාශ කරන ලදී. නැවත උත්සාහ කරන්න."),
        dec("⚠️ *System Fault*", "⚙️ PDF Generator ක්‍රියා විරහිතයි. Report ආකෘතිය නිර්මාණය කිරීමට නොහැකි විය 🤖."),
        dec("🔴 *Data Build Error*", "📡 PDF Buffer එක සම්පූර්ණ කිරීම අසාර්ථකයි. පසුව නැවත උත්සාහ කර බලන්න."),
        dec("⚠️ *Execution Error*", "🛑 PDF Outout File එක නිර්මාණය කළ නොහැක. ක්‍රියාවලිය අත්හිටුවන ලදී."),
        dec("🔴 *Engine Failure*", "🤖 Report Generation Aborted. පද්ධති දෝෂයක්. කරුණාකර නැවත උත්සාහ කරන්න ⚙️."),
    ],

    // ══════════════════════════════════════════════════════
    // 🗂️ VAULT SAVED
    // ══════════════════════════════════════════════════════
    vault_saved: [
        dec("🔒 *Data Encrypted & Saved*", "🤖 අධි-සුරක්ෂිත Olya Vault ගබඩාව වසා ඇත."),
        dec("✅ *Operation Complete*", "🔐 Private Key මගින් Data Vault එකට ගබඩා කර ඇත ⚙️."),
        dec("🟢 *System Log Updated*", "🤖 දත්ත ගබඩාවට ආරක්ෂිතව උඩුගත කරන ලදී."),
        dec("📡 *Storage Write Success*", "🔒 Vault Memory Block එක යාවත්කාලීන විය."),
        dec("🟢 *Encrypted Storage Active*", "🤖 දත්ත සමුදාය ආරක්ෂිතයි."),
        dec("✅ *Action Confirmed*", "⚙️ දත්ත සුරක්ෂිතයි, Protocol සම්පූර්ණයි."),
    ],

    // ══════════════════════════════════════════════════════
    // 😊 GENERAL / UNKNOWN CHAT
    // ══════════════════════════════════════════════════════
    general_chat: [
        dec("🟢 *System Active*", "🤖 මට ඔබගේ Command එක හඳුනාගැනීමට අපහසුයි (Unknown Input).\nECCPMS රිපෝර්ට් එකක් අවශ්‍ය නම්, Command Line එකේ 'report' ලෙස type කරන්න."),
        dec("🔴 *Undefined Command*", "⚙️ ඔබගේ පණිවිඩය AI Classifier විසින් ප්‍රතික්ෂේප කර ඇත.\nReport Action එක ආරම්භ කිරීමට 'report' Output කරන්න."),
        dec("⚠️ *Syntax Error*", "🤖 අදාළ පණිවිඩය සඳහා ක්‍රියාවලියක් හඳුනාගෙන නැත. සහය වීමට, 'report' Type කරන්න."),
        dec("🔴 *Command Error*", "📡 Olya Natural Language Protocol හට මෙය හඳුනාගත නොහැක. Report එකක් සඳහා 'report' ලෙස විධානය දෙන්න."),
        dec("🟡 *System Notice*", "🤖 Command Line Input එක පැහැදිලි මදි. Report Action Initialize කිරීමට 'report' Keyword එක පාවිච්චි කරන්න ⚙️."),
        dec("🟢 *AI Fallback Active*", "⚡ විධානය නොගැලපේ. වාර්තාවක් අවශ්‍ය නම් 'report' ලබාදෙන්න."),
    ],

    // ══════════════════════════════════════════════════════
    // 🔇 ANTI-DELETE REPLY (function)
    // ══════════════════════════════════════════════════════
    anti_delete: (text) => pick([
        dec("🔴 *System Breach Detected*", `🤖 Delete කළ පණිවිඩයක් Intercept කළා. Data ලොග් එක හන්සක වෙත සම්ප්‍රේෂණය කිරීමට සුරක්ෂිත කළා ⚙️.\n\n*Recovered Data:*\n${text}`),
        dec("⚠️ *Protocol Override*", `📡 ඔබගේ මකා දැමූ දත්ත Olya System එක මගින් නැවත ගොඩනංවන ලදී. Activity Logged.\n\n*Recovered Data:*\n${text}`),
        dec("🔴 *Security System Alert*", `🤖 මකාදැමීම අසාර්ථකයි. Anti-Delete නියමු කේතය ක්‍රියාත්මකයි.\n\n*Recovered Data:*\n${text}`),
        dec("🔒 *Data Retention Enabled*", `⚙️ මකා දැමූ Packet එක Buffer එකෙන් අල්ලා ගත්තා.\n\n*Recovered Data:*\n${text}`),
    ]),

    // ══════════════════════════════════════════════════════
    // 👁️ VIEW ONCE INTERCEPT
    // ══════════════════════════════════════════════════════
    view_once_intercept: [
        dec("🔴 *Security Override Active*", "🔒 View-Once Privacy Protocol එක Olya AI විසින් Bypass කළා. Media Data ගබඩා කරන ලදී 🤖."),
        dec("⚠️ *Restriction Bypassed*", "🟢 View-Once ඡායාරූපය System Buffer මගින් රඳවා ගත්තා. Olya Encryption Protocol."),
        dec("🔴 *Protocol Warning*", "📸 View-once සීමා කිරීම් Olya AI හට බාධාවක් නොවේ. දත්ත ප්‍රතිසාධනය විය 🤖."),
        dec("⚡ *System Hack Executed*", "🔴 View-Once File එක Decode කර නැවත ලබාගත්තා. Privacy Level Down."),
        dec("✅ *Data Extraction Compete*", "🔐 View-Once සීමාව බිඳ දමා Media එක System Database වෙත ලබාගත්තා 🤖."),
        dec("📡 *Intercept Protocol Active*", "⚙️ View-Once මාධ්‍යයේ අයිතිකරුගේ අවසරයෙන් තොරව පිටපතක් සුරක්ෂිත කළා."),
    ],

    // ══════════════════════════════════════════════════════
    // 📄 PDF REPORT CAPTION — GENERAL (function)
    // ══════════════════════════════════════════════════════
    report_caption_general: (name, month) => pick([
        dec("✅ *Report Generated*", `📄 ${name}ගේ ${month} ECCPMS දත්ත වාර්තාව මෙන්න.\nSystem Operations සම්පූර්ණයි 🤖.`),
        dec("🟢 *Compilation Success*", `⚙️ ${name} හි ${month} Monthly Report එක අවසන්.\nDocument Uploading...`),
        dec("📡 *Process Complete*", `🤖 ${name}ගේ ${month} දත්ත විශ්ලේෂණය (Data Analysis) මෙන්න.`),
        dec("🟢 *Task Finished*", `⚙️ ${month} මාසයේ වාර්තාව (PDF) ${name} වෙත සපයන ලදී 🤖.`),
    ]),

    // ══════════════════════════════════════════════════════
    // 📄 PDF REPORT CAPTION — VIP (function)
    // ══════════════════════════════════════════════════════
    report_caption_vip: (month) => pick([
        dec("✅ *PDF Render Complete*", `✨ ${month} ECCPMS Report එක Generate කළා මිස්.\nOlya System Online 🤖.`),
        dec("🟢 *Priority Task Completed*", `⚙️ ${month} Report එක සම්පූර්ණයි මිස්.\nData Processing සුමටව නිම විය.`),
        dec("📡 *Success*", `🤖 මිස්ගේ ${month} PDF වාර්තාව මෙන්න.`),
        dec("🟢 *Finalizing Output*", `✨ ${month} Report Data මෙන්න මිස්.\nOlya AI Engine Standby... 🤖.`),
    ]),

    // ══════════════════════════════════════════════════════
    // 🏆 POST-REPORT POINTS SUMMARY — VIP (function)
    // ══════════════════════════════════════════════════════
    report_points_summary_vip: (points) => pick([
        dec("📈 *Performance Analysis*", `✨ ලකුණු *${points}* ක් System එකේ සටහන් වී ඇත!\nExcellent metrics! 🤖`),
        dec("🟢 *Data Scan Result*", `⚙️ Total Points = *${points}*.\nMetric Level: Outstanding. Keep Optimizing!`),
        dec("🔓 *Achievement Unlock*", `✨ *${points}* Points!\nSystem Ratings ඉහළ අගයක පවතී 🤖.`),
        dec("✅ *Metrics Verified*", `📡 ලකුණු ගණන: *${points}*.\nPerfect Data Flow.`),
    ]),
};

// ── FOOTER SKIP LIST ──
// Functions return formatted strings; no auto-footer needed.
const NO_FOOTER_KEYS = [
    'anti_delete',
    'report_caption_general',
    'report_caption_vip',
    'report_points_summary_vip',
    'vault_saved',
];

/**
 * Get a random template message by key.
 * Automatically appends the Olya footer to all string templates.
 * Function templates (like captions) must be called manually with args.
 *
 * @param {string} key - Template key
 * @returns {string|Function} - Ready-to-send message or function
 */
const getTemplate = (key) => {
    const t = templates[key];
    if (t === undefined) return dec("🔴 *System Failure*", "🤖 දෝෂයක් හටගත්තා. කරුණාකරලා නැවත උත්සාහ කරන්න.") + FOOTER;

    // Return functions as-is
    if (typeof t === 'function') {
        return (...args) => t(...args) + FOOTER;
    }

    const skipFooter = NO_FOOTER_KEYS.includes(key);
    const msg = Array.isArray(t) ? pick(t) : t;

    return skipFooter ? msg + FOOTER : msg + FOOTER; // Add footer to everything including functions now based on user request "හැම එකේම අවසානයට මගේ ෆූටර් එක එන්නම ඕනි"
};

module.exports = { getTemplate, templates, FOOTER };
require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const fs = require("fs"), crypto = require("crypto");

const BOT_TOKEN = process.env.BOT_TOKEN || "8378476992:AAFbY6bBMO1rlglBZHuPCJNUhqQhs2YjkfE";
const ADMIN = String(process.env.ADMIN_ID || "7383152421");
const bot = new Telegraf(BOT_TOKEN);
const API = process.env.API_BASE || "https://surprised-november-builds-aquatic.trycloudflare.com";
const BANK_API = process.env.BANK_API_URL || "https://thueapibank.vn/historyapimbbankv2/01c63b8de6bbc39670db076b6dfc2cae";

const BANK = { name:"MBANK", stk:"0345915209", owner:"LE QUANG HƯNG" };
const FILE = "data.json";
const GAME = {
  "LAUCUA79":"laucua79","BETVIP":"betvip","XOCDIA88":"xocdia88",
  "HAYWIN":"haywin","LUCKYWIN":"luckywin","HITCLUB":"hitclub",
  "B52":"b52","SUNWIN":"sunwin","MAX789":"max789"
};
const PLAN = {
  "🔑 10 GIỜ • 15K":["10h",15000,10*3600000],
  "🔑 1 NGÀY • 30K":["1d",30000,86400000],
  "🔑 3 NGÀY • 50K":["3d",50000,3*86400000],
  "🔑 7 NGÀY • 70K":["7d",70000,7*86400000],
  "🔑 30 NGÀY • 110K":["30d",110000,30*86400000]
};

let db = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE)) : {users:{},orders:{},keys:{},used:{}};
const save=()=>fs.writeFileSync(FILE,JSON.stringify(db,null,2));
const uid=c=>String(c.from.id);
const admin=c=>uid(c)===ADMIN;
const user=c=>{
  const id=uid(c);
  if(!db.users[id]) db.users[id]={id,balance:0,vip:0,game:null,mode:null,auto:false,last:null,state:null};
  save(); return db.users[id];
};
const money=n=>Number(n||0).toLocaleString("vi-VN")+"đ";
const vip=u=>Number(u.vip)>Date.now();
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
const num=s=>Number(String(s??"").replace(/[^\d]/g,""))||0;
const keygen=()=>`VIP-${crypto.randomBytes(2).toString("hex").toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

const kbMain=c=>Markup.keyboard([
  ["CHỌN GAME"],
  ["NẠP TIỀN","MUA KEY"],
  ["NHẬP KEY","THÔNG TIN"],
  ...(admin(c)?[["ADMIN"]]:[])
]).resize();

const kbGames=()=>Markup.keyboard([
  ["LAUCUA79","BETVIP"],
  ["XOCDIA88","HAYWIN"],
  ["LUCKYWIN","HITCLUB"],
  ["B52","SUNWIN"],
  ["MAX789"],
  ["QUAY LẠI"]
]).resize();

const kbMode=()=>Markup.keyboard([
  ["TÀI XỈU","TÀI XỈU MD5"],["BẬT AUTO","DỪNG AUTO"],["XEM NGAY","QUAY LẠI"]
]).resize();

const kbDeposit=()=>Markup.keyboard([
  ["50K","100K"],["200K","500K"],["SỐ KHÁC"],["QUAY LẠI"]
]).resize();

const kbKey=()=>Markup.keyboard([
  ["🔑 10 GIỜ • 15K","🔑 1 NGÀY • 30K"],["🔑 3 NGÀY • 50K","🔑 7 NGÀY • 70K"],
  ["🔑 30 NGÀY • 110K"],["QUAY LẠI"]
]).resize();

const kbAdmin=()=>Markup.keyboard([
  ["TẠO KEY","CỘNG TIỀN"],["TRỪ TIỀN","THÊM VIP"],
  ["ĐƠN CHỜ","TEST BANK"],["XEM USER","THỐNG KÊ"],["THÔNG BÁO"],["QUAY LẠI"]
]).resize();

function home(c){
  const u=user(c);
  return c.reply(
    `🤖 <b>TOOL TÀI XỈU</b>

🎮 Game: <b>${u.game||"Chưa chọn"}</b>
🎯 Chế độ: <b>${u.mode||"Chưa chọn"}</b>
💰 Số dư: <b>${money(u.balance)}</b>
💎 VIP: <b>${vip(u)?"Có":"Chưa có"}</b>`,
    {parse_mode:"HTML",...kbMain(c)}
  );
}

bot.start(home);
bot.hears("QUAY LẠI",home);

bot.hears("CHỌN GAME",c=>c.reply("Chọn game:",kbGames()));

for(const [label,g] of Object.entries(GAME)){
  bot.hears(label,c=>{
    const u=user(c); u.game=g; u.mode=null; u.auto=false; u.last=null; save();
    return c.reply(`${label}\nChọn chế độ:`,kbMode());
  });
}

bot.hears("TÀI XỈU",c=>setMode(c,"tx"));
bot.hears("TÀI XỈU MD5",c=>setMode(c,"md5"));
function setMode(c,m){
  const u=user(c); if(!u.game) return c.reply("⚠️ Chọn game trước.");
  u.mode=m;u.auto=false;u.last=null;save();
  return c.reply(`✅ ${u.game.toUpperCase()} • ${m==="tx"?"TÀI XỈU":"MD5"}`,kbMode());
}

async function getJSON(url){
  const r=await fetch(url); if(!r.ok) throw Error("API lỗi "+r.status); return r.json();
}
function pick(o,...a){for(const k of a) if(o?.[k]!=null) return o[k]}
function parse(d){
  const old=pick(d,"phien","Phien_truoc","phien_truoc","phien_da_co_ket_qua");
  const now=pick(d,"phien_hien_tai","Phien_nay","phien_nay") ?? (Number(old)?Number(old)+1:null);
  let dice=pick(d,"Xucxac","xucxac","xuc_xac");
  if(!dice){
    const a=pick(d,"xuc_xac_1","xx1"),b=pick(d,"xuc_xac_2","xx2"),c=pick(d,"xuc_xac_3","xx3");
    if(a!=null&&b!=null&&c!=null) dice=`${a}-${b}-${c}`;
  }
  const tx=v=>norm(v).includes("TAI")?"TÀI":norm(v).includes("XIU")?"XỈU":String(v??"?");
  return {
    old,now,dice,total:pick(d,"tong","total"),
    result:tx(pick(d,"ket_qua","Ketqua","ketqua","result")),
    pred:tx(pick(d,"du_doan","Dudoan","dudoan","prediction")),
    conf:pick(d,"do_tin_cay","Dotincay","dotincay","confidence")
  };
}
const icon=x=>x==="TÀI"?"🔴":x==="XỈU"?"🔵":"⚪";
async function predict(u){
  if(!u.game||!u.mode) throw Error("Chưa chọn game/chế độ");
  return parse(await getJSON(`${API}/${u.mode==="tx"?"taixiu":"taixiumd5"}/${u.game}`));
}
function fmt(u,p){
  return [
    `<b>${u.game.toUpperCase()} • ${u.mode==="tx"?"TÀI XỈU":"MD5"}</b>`,`━━━━━━━━━━━━━━━━`,
    p.old!=null?`Phiên trước: <b>#${p.old}</b>`:"",
    p.dice?`Xúc xắc: <b>${p.dice}</b>`:"",
    p.total!=null?`Tổng: <b>${p.total}</b>`:"",
    p.result!=="?"?`Kết quả: <b>${p.result}</b>`:"",
    "",p.now!=null?`Phiên mới: <b>#${p.now}</b>`:"",
    `Dự đoán: <b>${p.pred}</b>`,
    p.conf!=null?`Tin cậy: <b>${String(p.conf).includes("%")?p.conf:p.conf+"%"}</b>`:""
  ].filter(Boolean).join("\n");
}

bot.hears("XEM NGAY",async c=>{
  const u=user(c); if(!admin(c)&&!vip(u)) return c.reply("🔒 Chưa có VIP.");
  try{c.reply(fmt(u,await predict(u)),{parse_mode:"HTML"})}catch(e){c.reply("⚠️ "+e.message)}
});
bot.hears("BẬT AUTO",c=>{
  const u=user(c); if(!admin(c)&&!vip(u)) return c.reply("🔒 Chưa có VIP.");
  if(!u.game||!u.mode) return c.reply("⚠️ Chọn game trước.");
  u.auto=true;u.last=null;save();c.reply("Đã bật Auto.");
});
bot.hears("DỪNG AUTO",c=>{const u=user(c);u.auto=false;save();c.reply("Đã dừng Auto.");});

setInterval(async()=>{
  for(const u of Object.values(db.users)){
    if(!u.auto) continue;
    if(!isAdminUser(u.id)&&!vip(u)){u.auto=false;save();continue}
    try{
      const p=await predict(u); if(p.now==null) continue;
      const k=`${u.game}:${u.mode}:${p.now}`; if(u.last===k) continue;
      u.last=k;save(); await bot.telegram.sendMessage(u.id,fmt(u,p),{parse_mode:"HTML"});
    }catch{}
  }
},3000);
const isAdminUser=id=>String(id)===ADMIN;

// ================= NẠP TIỀN =================
bot.hears("NẠP TIỀN",c=>c.reply("Chọn số tiền:",kbDeposit()));
for(const [label,amount] of Object.entries({"50K":50000,"100K":100000,"200K":200000,"500K":500000}))
  bot.hears(label,c=>createDeposit(c,amount));
bot.hears("SỐ KHÁC",c=>{const u=user(c);u.state="deposit";save();c.reply("Gửi số tiền muốn nạp (tối thiểu 10.000):");});

async function createDeposit(c,amount){
  if(amount<10000) return c.reply("⚠️ Tối thiểu 10.000đ.");
  const code="NAP"+crypto.randomInt(100000,999999);
  const id=crypto.randomUUID();
  db.orders[id]={id,userId:uid(c),amount,code,status:"pending",created:Date.now()};
  save();
  const qr=`https://img.vietqr.io/image/MB-${BANK.stk}-compact2.png?amount=${amount}&addInfo=${code}&accountName=${encodeURIComponent(BANK.owner)}`;
  c.reply(`💳 <b>NẠP TIỀN</b>\n━━━━━━━━━━━━━━\n🏦 ${BANK.name}\n💳 <code>${BANK.stk}</code>\n👤 <b>${BANK.owner}</b>\n💵 <b>${money(amount)}</b>\n📝 <code>${code}</code>`,
    {parse_mode:"HTML",...Markup.inlineKeyboard([[Markup.button.url("📷 QR",qr)]])});
}
async function txs(){
  const j=await getJSON(BANK_API);
  return Array.isArray(j?.transactions)?j.transactions:Array.isArray(j?.data)?j.data:Array.isArray(j)?j:[];
}
function tid(t){return String(t.transactionID??t.transactionId??t.id??`${t.transactionDate}_${t.amount}_${t.description}`)}
function match(o,t){
  if(o.status!=="pending"||db.used[tid(t)]) return false;
  return num(t.amount)===o.amount && norm(t.description||t.content||t.remark).includes(norm(o.code));
}
async function approve(o,t,manual=false){
  const u=db.users[o.userId]||ensureById(o.userId);

  if(t&&!manual){
    const id=tid(t);
    if(db.used[id]) return false;
    db.used[id]={order:o.id,approved:true};
    o.transactionID=id;
  }

  u.balance=Number(u.balance||0)+o.amount;
  o.status="paid";
  o.approvedAt=Date.now();
  o.approvedBy=manual?"admin":"bank_auto";
  save();

  // Gửi user
  try{
    await bot.telegram.sendMessage(
      o.userId,
      `Nạp thành công <b>${money(o.amount)}</b>\nSố dư: <b>${money(u.balance)}</b>`,
      {parse_mode:"HTML"}
    );
  }catch{}

  // Auto duyệt xong thì báo về admin
  try{
    await bot.telegram.sendMessage(
      ADMIN,
      [
        `<b>ĐÃ AUTO DUYỆT GIAO DỊCH</b>`,
        ``,
        `User: <code>${o.userId}</code>`,
        `Username: ${u.username ? "@"+u.username : "không có"}`,
        `Số tiền: <b>${money(o.amount)}</b>`,
        `Nội dung: <code>${o.code}</code>`,
        t ? `Mã GD: <code>${tid(t)}</code>` : `Duyệt: <b>ADMIN</b>`,
        `Số dư mới: <b>${money(u.balance)}</b>`
      ].join("\n"),
      {parse_mode:"HTML"}
    );
  }catch{}

  return true;
}
const ensureById=id=>(db.users[id]||(db.users[id]={id,balance:0,vip:0,game:null,mode:null,auto:false,last:null,state:null}));
setInterval(async()=>{
  const pending=Object.values(db.orders).filter(o=>o.status==="pending");
  if(!pending.length) return;

  try{
    const a=await txs();

    for(const o of pending){
      for(const t of a){
        if(!match(o,t)) continue;
        await approve(o,t,false); // AUTO DUYỆT
        break;
      }
    }
  }catch{}
},8000);

// ================= KEY =================
bot.hears("MUA KEY",c=>c.reply("Chọn gói:",kbKey()));
for(const [label,[id,price,ms]] of Object.entries(PLAN)){
  bot.hears(label,c=>{
    const u=user(c); if(u.balance<price) return c.reply(`❌ Thiếu số dư. Cần ${money(price)}.`);
    u.balance-=price; const k=keygen();
    db.keys[k]={plan:id,ms,owner:uid(c),used:false};save();
    c.reply(`✅ Mua key thành công\n🔐 <code>${k}</code>\n💰 Còn: <b>${money(u.balance)}</b>`,{parse_mode:"HTML",...kbMain(c)});
  });
}
bot.hears("NHẬP KEY",c=>{const u=user(c);u.state="key";save();c.reply("Gửi key VIP của bạn:");});
bot.hears("THÔNG TIN",c=>{
  const u=user(c);c.reply(`👤 ID: <code>${uid(c)}</code>\n💰 Số dư: <b>${money(u.balance)}</b>\n💎 VIP: <b>${vip(u)?new Date(u.vip).toLocaleString("vi-VN"):"Chưa có"}</b>`,{parse_mode:"HTML"});
});

// ================= ADMIN =================
bot.hears("ADMIN",c=>{if(admin(c)) c.reply("ADMIN",kbAdmin());});
bot.hears("TẠO KEY",c=>{if(admin(c)){const u=user(c);u.state="admin_key";save();c.reply("Gửi: 1d 5  (gói + số lượng)");}});
bot.hears("CỘNG TIỀN",c=>{if(admin(c)){const u=user(c);u.state="admin_add";save();c.reply("Gửi: USER_ID 50000");}});
bot.hears("TRỪ TIỀN",c=>{if(admin(c)){const u=user(c);u.state="admin_sub";save();c.reply("Gửi: USER_ID 50000");}});
bot.hears("THÊM VIP",c=>{if(admin(c)){const u=user(c);u.state="admin_vip";save();c.reply("Gửi: USER_ID 1d");}});
bot.hears("XEM USER",c=>{if(admin(c)){const u=user(c);u.state="admin_user";save();c.reply("Gửi USER_ID");}});
bot.hears("THÔNG BÁO",c=>{if(admin(c)){const u=user(c);u.state="admin_bc";save();c.reply("Gửi nội dung thông báo");}});
bot.hears("THỐNG KÊ",c=>{if(admin(c)) c.reply(`👥 User: ${Object.keys(db.users).length}\n🔑 Key: ${Object.keys(db.keys).length}\n💰 Đơn nạp: ${Object.keys(db.orders).length}`);});
bot.hears("TEST BANK",async c=>{if(admin(c))try{c.reply(`✅ Bank API OK • ${(await txs()).length} giao dịch`)}catch(e){c.reply("❌ "+e.message)}});

bot.hears("ĐƠN CHỜ",c=>{
  if(!admin(c)) return;
  const a=Object.values(db.orders).filter(o=>o.status==="pending").slice(0,20);
  if(!a.length) return c.reply("Không có đơn chờ.");
  c.reply("Chọn đơn:",Markup.inlineKeyboard(a.map(o=>[Markup.button.callback(`${money(o.amount)} • ${o.code}`,`duyet:${o.id}`)])));
});
bot.action(/^duyet:(.+)$/,async c=>{
  if(!admin(c)) return c.answerCbQuery("Không có quyền");
  const o=db.orders[c.match[1]];
  if(!o||o.status!=="pending") return c.answerCbQuery("Đơn không còn chờ");
  await approve(o,null,true);
  c.answerCbQuery("Đã duyệt");
  c.editMessageText(`Đã duyệt ${money(o.amount)} cho ${o.userId}`);
});



// Nhận dữ liệu sau khi bấm nút
bot.on("text",async(c,next)=>{
  const u=user(c),t=c.message.text.trim(),s=u.state;
  if(!s) return next();

  if(s==="deposit"){u.state=null;save();return createDeposit(c,num(t))}
  if(s==="key"){
    const k=db.keys[t.toUpperCase()];
    if(!k||k.used) return c.reply("❌ Key sai hoặc đã dùng.");
    if(k.owner&&k.owner!==uid(c)) return c.reply("❌ Key không thuộc tài khoản này.");
    u.vip=Math.max(Date.now(),u.vip||0)+k.ms;k.used=true;u.state=null;save();
    return c.reply(`✅ Kích hoạt thành công\n💎 VIP đến: <b>${new Date(u.vip).toLocaleString("vi-VN")}</b>`,{parse_mode:"HTML",...kbMain(c)});
  }

  if(admin(c)&&s==="admin_key"){
    const [p,countRaw]=t.split(/\s+/),count=Math.min(20,Math.max(1,Number(countRaw)||1));
    const plan=Object.values(PLAN).find(x=>x[0]===p); if(!plan) return c.reply("Gói: 10h,1d,3d,7d,30d");
    const out=[];for(let i=0;i<count;i++){const k=keygen();db.keys[k]={plan:p,ms:plan[2],owner:null,used:false};out.push(k)}
    u.state=null;save();return c.reply(out.join("\n"),kbAdmin());
  }

  if(admin(c)&&["admin_add","admin_sub"].includes(s)){
    const [id,a]=t.split(/\s+/),n=num(a),x=ensureById(id);
    x.balance=Math.max(0,Number(x.balance||0)+(s==="admin_add"?n:-n));u.state=null;save();
    return c.reply(`✅ ${id}: ${money(x.balance)}`,kbAdmin());
  }

  if(admin(c)&&s==="admin_vip"){
    const [id,p]=t.split(/\s+/),plan=Object.values(PLAN).find(x=>x[0]===p);if(!plan)return c.reply("Gói sai.");
    const x=ensureById(id);x.vip=Math.max(Date.now(),x.vip||0)+plan[2];u.state=null;save();
    return c.reply("✅ Đã thêm VIP.",kbAdmin());
  }

  if(admin(c)&&s==="admin_user"){
    const x=db.users[t];if(!x)return c.reply("Không tìm thấy user.");
    u.state=null;save();return c.reply(`ID: ${t}\nSố dư: ${money(x.balance)}\nVIP: ${vip(x)?"ON":"OFF"}\nGame: ${x.game||"-"}\nMode: ${x.mode||"-"}`,kbAdmin());
  }

  if(admin(c)&&s==="admin_bc"){
    let ok=0;for(const x of Object.values(db.users))try{await bot.telegram.sendMessage(x.id,`📢 ${t}`);ok++}catch{}
    u.state=null;save();return c.reply(`✅ Đã gửi ${ok} user`,kbAdmin());
  }

  return next();
});

bot.catch(e=>console.log("BOT:",e.message));
bot.launch().then(()=>console.log("✅ Bot chạy")).catch(console.error);
process.once("SIGINT",()=>bot.stop("SIGINT"));
process.once("SIGTERM",()=>bot.stop("SIGTERM"));

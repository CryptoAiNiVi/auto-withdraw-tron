const fs = require('fs');
const TronWeb = require('tronweb');
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config.json');

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  privateKey: config.privateKey
});

const bot = new TelegramBot(config.telegramToken, { polling: true });

function saveConfig() {
  fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
}

bot.on('message', (msg) => {
  console.log('📩 پیام دریافتی:', msg.text);
});

// 🟢 /start با منوی گرافیکی
bot.onText(/\/start/, (msg) => {
  if (msg.chat.id.toString() !== config.telegramChatId) return;

  bot.sendMessage(msg.chat.id, 'سلام! یکی از گزینه‌های زیر را انتخاب کن:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💰 بررسی موجودی', callback_data: 'check_balance' },
          { text: '✏️ تغییر آدرس', callback_data: 'change_address' },
        ],
        [
          { text: '⚙️ تغییر حداقل برداشت', callback_data: 'change_min' },
          { text: '⏱ تغییر فاصله زمانی', callback_data: 'change_interval' },
        ],
        [{ text: '📖 راهنما', callback_data: 'help' }]
      ]
    }
  });
});

// واکنش به کلیک روی دکمه‌ها
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  if (chatId.toString() !== config.telegramChatId) return;

  const action = query.data;
  switch (action) {
    case 'check_balance':
      try {
        const balanceSun = await tronWeb.trx.getBalance(config.senderAddress);
        const balance = tronWeb.fromSun(balanceSun);
        bot.sendMessage(chatId, `💰 موجودی ولت: ${balance} TRX`);
      } catch (err) {
        bot.sendMessage(chatId, '❌ خطا در بررسی موجودی.');
        console.error(err);
      }
      break;

    case 'change_address':
      bot.sendMessage(chatId, '📝 لطفاً آدرس جدید گیرنده را ارسال کن:');
      bot.once('message', (msg) => {
        if (!tronWeb.isAddress(msg.text)) {
          bot.sendMessage(chatId, '❌ آدرس معتبر نیست.');
        } else {
          config.receiverAddress = msg.text;
          saveConfig();
          bot.sendMessage(chatId, `✅ آدرس جدید ذخیره شد: ${msg.text}`);
        }
      });
      break;

    case 'change_min':
      bot.sendMessage(chatId, '🔢 مقدار حداقل برداشت را وارد کن (مثلاً 5):');
      bot.once('message', (msg) => {
        const val = parseFloat(msg.text);
        if (isNaN(val)) {
          bot.sendMessage(chatId, '❌ مقدار نامعتبر است.');
        } else {
          config.minAmount = val;
          saveConfig();
          bot.sendMessage(chatId, `✅ حداقل مقدار برداشت تنظیم شد: ${val} TRX`);
        }
      });
      break;

    case 'change_interval':
      bot.sendMessage(chatId, '⏱ فاصله زمانی برداشت را وارد کن (برحسب ثانیه):');
      bot.once('message', (msg) => {
        const val = parseInt(msg.text);
        if (isNaN(val)) {
          bot.sendMessage(chatId, '❌ عدد معتبر نیست.');
        } else {
          config.interval = val;
          saveConfig();
          bot.sendMessage(chatId, `✅ فاصله زمانی ذخیره شد: ${val} ثانیه`);
        }
      });
      break;

    case 'help':
      bot.sendMessage(chatId, `
📖 راهنمای دستورات:

/setreceiver [آدرس] - تنظیم آدرس گیرنده TRX  
/setmin [عدد] - تنظیم حداقل مقدار برداشت  
/setinterval [ثانیه] - تنظیم فاصله زمانی برداشت  
/checkbalance - بررسی موجودی  
/start - نمایش منو  
/help - همین راهنما
      `);
      break;

    default:
      bot.sendMessage(chatId, '❓ دستور ناشناخته.');
  }

  bot.answerCallbackQuery(query.id);
});

// دستورات متنی نیز همچنان فعال‌اند:
bot.onText(/\/setreceiver (.+)/, (msg, match) => {
  if (msg.chat.id.toString() !== config.telegramChatId) return;
  const newAddress = match[1];
  if (!tronWeb.isAddress(newAddress)) {
    bot.sendMessage(msg.chat.id, '❌ آدرس معتبر نیست.');
    return;
  }
  config.receiverAddress = newAddress;
  saveConfig();
  bot.sendMessage(msg.chat.id, `✅ آدرس جدید ذخیره شد: ${newAddress}`);
});

bot.onText(/\/setmin (\d+)/, (msg, match) => {
  if (msg.chat.id.toString() !== config.telegramChatId) return;
  const newMin = parseFloat(match[1]);
  config.minAmount = newMin;
  saveConfig();
  bot.sendMessage(msg.chat.id, `✅ حداقل مقدار جدید: ${newMin} TRX`);
});

bot.onText(/\/setinterval (\d+)/, (msg, match) => {
  if (msg.chat.id.toString() !== config.telegramChatId) return;
  const newInterval = parseInt(match[1]);
  config.interval = newInterval;
  saveConfig();
  bot.sendMessage(msg.chat.id, `✅ فاصله زمانی جدید: ${newInterval} ثانیه`);
});

bot.onText(/\/checkbalance/, async (msg) => {
  if (msg.chat.id.toString() !== config.telegramChatId) return;
  try {
    const balanceSun = await tronWeb.trx.getBalance(config.senderAddress);
    const balance = tronWeb.fromSun(balanceSun);
    bot.sendMessage(msg.chat.id, `💰 موجودی فعلی: ${balance} TRX`);
  } catch (err) {
    bot.sendMessage(msg.chat.id, '❌ خطا در بررسی موجودی.');
    console.error(err);
  }
});

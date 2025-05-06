const fs = require('fs');
const TronWeb = require('tronweb');
const axios = require('axios');
const config = require('./config.json');

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  privateKey: config.privateKey
});

async function checkAndWithdraw() {
  try {
    const balanceSun = await tronWeb.trx.getBalance(config.senderAddress);
    const balanceTRX = tronWeb.fromSun(balanceSun);
    console.log(`💰 موجودی فعلی: ${balanceTRX} TRX`);

    if (balanceTRX >= config.minAmount) {
      const amountSun = balanceSun - 1000000;
      const tx = await tronWeb.transactionBuilder.sendTrx(
        config.receiverAddress,
        amountSun,
        config.senderAddress
      );
      const signedTx = await tronWeb.trx.sign(tx, config.privateKey);
      const receipt = await tronWeb.trx.sendRawTransaction(signedTx);

      if (receipt.result) {
        console.log(`✅ تراکنش انجام شد: ${receipt.txid}`);
        sendTelegram(`✅ برداشت موفق\n📦 TxID: ${receipt.txid}`);
      } else {
        console.log('❌ خطا در ارسال تراکنش');
        sendTelegram('❌ خطا در ارسال تراکنش');
      }
    }
  } catch (err) {
    console.error('❌ خطا در برداشت:', err.message);
    sendTelegram('❌ خطا در برداشت: ' + err.message);
  }
}

function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;
  axios.post(url, {
    chat_id: config.telegramChatId,
    text: message
  }).catch(err => {
    console.error('❌ خطا در ارسال پیام تلگرام:', err.message);
  });
}

setInterval(checkAndWithdraw, config.interval * 1000);
checkAndWithdraw();
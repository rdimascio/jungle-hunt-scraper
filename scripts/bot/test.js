const TelegramBot = require('node-telegram-bot-api')
const telegramBotToken = '894036353:AAEch4kCYoS7AUdm2qXPtUaxPHgDVjVvn48'
const jungleHuntBot = new TelegramBot(telegramBotToken)

jungleHuntBot.sendMessage(605686296, 'Testing, testing. Is this thing on?')

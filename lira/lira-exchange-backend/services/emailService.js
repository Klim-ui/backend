const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Настройка SMTP транспорта
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true для 465, false для других портов
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Проверяем соединение при инициализации
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service ready');
    } catch (error) {
      console.error('❌ Email service error:', error.message);
      console.log('📧 Email notifications will be logged instead of sent');
    }
  }

  // Отправить email или записать в лог если SMTP не настроен
  async sendOrLog(to, subject, html, text) {
    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const info = await this.transporter.sendMail({
          from: `"LIRA Exchange" <${process.env.SMTP_USER}>`,
          to,
          subject,
          html,
          text
        });
        console.log('📧 Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
      } else {
        // Логируем вместо отправки если SMTP не настроен
        console.log('\n📧 EMAIL NOTIFICATION (would be sent):');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content: ${text}`);
        console.log('─'.repeat(50));
        return { success: true, logged: true };
      }
    } catch (error) {
      console.error('❌ Email send error:', error.message);
      // Логируем даже при ошибке отправки
      console.log('\n📧 EMAIL NOTIFICATION (failed to send):');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${text}`);
      console.log('─'.repeat(50));
      return { success: false, error: error.message };
    }
  }

  // Уведомление о создании нового обмена
  async sendExchangeInitiated(userEmail, exchange) {
    const subject = `Обмен #${exchange._id.toString().substring(0, 8)} создан`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">LIRA Exchange</h2>
        <h3>Ваш обмен создан успешно!</h3>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h4>Детали обмена:</h4>
          <p><strong>ID обмена:</strong> ${exchange._id.toString().substring(0, 8)}...</p>
          <p><strong>Направление:</strong> ${exchange.fromCurrency} → ${exchange.toCurrency}</p>
          <p><strong>Отдаете:</strong> ${exchange.fromAmount} ${exchange.fromCurrency}</p>
          <p><strong>Получите:</strong> ${exchange.toAmount} ${exchange.toCurrency}</p>
          <p><strong>Курс:</strong> ${exchange.exchangeRate}</p>
          <p><strong>Комиссия:</strong> ${exchange.feePercentage}% (${exchange.feeAmount} ${exchange.toCurrency})</p>
          <p><strong>Статус:</strong> <span style="color: #6c757d;">Инициирован</span></p>
        </div>

        ${exchange.fromCurrency === 'TRY' ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4>🏦 Инструкции для перевода TRY:</h4>
            <p>Переведите <strong>${exchange.fromAmount} TRY</strong> на наши реквизиты:</p>
            <p><strong>IBAN:</strong> TR12 3456 7890 1234 5678 9012 34</p>
            <p><strong>Описание платежа:</strong> Exchange ${exchange._id.toString().substring(0, 8)}</p>
            <p><em>После получения вашего перевода мы отправим RUB на ваши реквизиты</em></p>
          </div>
        ` : ''}

        ${exchange.fromCurrency === 'TON' ? `
          <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4>💎 Инструкции для перевода TON:</h4>
            <p>Переведите <strong>${exchange.fromAmount} TON</strong> на адрес:</p>
            <p style="font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 3px;">
              ${exchange.sourceTransaction?.address || 'Адрес будет предоставлен'}
            </p>
            <p><em>Статус вашего перевода будет отслеживаться автоматически</em></p>
          </div>
        ` : ''}

        <p>Вы можете отслеживать статус обмена в личном кабинете.</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6c757d; font-size: 12px;">
          Это автоматическое уведомление. Если у вас есть вопросы, свяжитесь с нашей поддержкой.
        </p>
      </div>
    `;

    const text = `
LIRA Exchange - Обмен создан

Ваш обмен #${exchange._id.toString().substring(0, 8)} создан успешно!

Детали:
- Направление: ${exchange.fromCurrency} → ${exchange.toCurrency}
- Отдаете: ${exchange.fromAmount} ${exchange.fromCurrency}
- Получите: ${exchange.toAmount} ${exchange.toCurrency}
- Курс: ${exchange.exchangeRate}
- Комиссия: ${exchange.feePercentage}%
- Статус: Инициирован

${exchange.fromCurrency === 'TRY' ? `
Переведите ${exchange.fromAmount} TRY на реквизиты:
IBAN: TR12 3456 7890 1234 5678 9012 34
Описание: Exchange ${exchange._id.toString().substring(0, 8)}
` : ''}

${exchange.fromCurrency === 'TON' ? `
Переведите ${exchange.fromAmount} TON на адрес:
${exchange.sourceTransaction?.address || 'Адрес будет предоставлен'}
` : ''}

Отслеживайте статус в личном кабинете.
    `;

    return await this.sendOrLog(userEmail, subject, html, text);
  }

  // Уведомление о подтверждении получения средств
  async sendExchangeProcessing(userEmail, exchange) {
    const subject = `Обмен #${exchange._id.toString().substring(0, 8)} в обработке`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">LIRA Exchange</h2>
        <h3>💰 Средства получены!</h3>
        
        <div style="background: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p>Мы получили ваш перевод <strong>${exchange.fromAmount} ${exchange.fromCurrency}</strong></p>
          <p>Обмен #${exchange._id.toString().substring(0, 8)} переведен в статус <strong style="color: #28a745;">В обработке</strong></p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h4>Что дальше:</h4>
          <p>✅ Ваши средства получены и подтверждены</p>
          <p>🔄 Обрабатываем ваш запрос на обмен</p>
          <p>💸 В ближайшее время отправим ${exchange.toAmount} ${exchange.toCurrency}</p>
          
          ${exchange.toCurrency === 'RUB' && exchange.bankAccount ? `
            <p><strong>Отправка на:</strong></p>
            <p>Банк: ${exchange.bankAccount.bank}</p>
            <p>Счет: ${exchange.bankAccount.accountId}</p>
          ` : ''}
        </div>

        <p>Среднее время обработки: <strong>15-30 минут</strong></p>
        <p>Вы получите уведомление как только обмен будет завершен.</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6c757d; font-size: 12px;">
          Это автоматическое уведомление. Если у вас есть вопросы, свяжитесь с нашей поддержкой.
        </p>
      </div>
    `;

    const text = `
LIRA Exchange - Средства получены

Мы получили ваш перевод ${exchange.fromAmount} ${exchange.fromCurrency}
Обмен #${exchange._id.toString().substring(0, 8)} в обработке.

Что дальше:
✅ Ваши средства получены и подтверждены
🔄 Обрабатываем ваш запрос на обмен  
💸 В ближайшее время отправим ${exchange.toAmount} ${exchange.toCurrency}

Среднее время обработки: 15-30 минут
Вы получите уведомление о завершении.
    `;

    return await this.sendOrLog(userEmail, subject, html, text);
  }

  // Уведомление о завершении обмена
  async sendExchangeCompleted(userEmail, exchange) {
    const subject = `Обмен #${exchange._id.toString().substring(0, 8)} завершен ✅`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">LIRA Exchange</h2>
        <h3 style="color: #28a745;">🎉 Обмен завершен успешно!</h3>
        
        <div style="background: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h4>Ваши средства отправлены!</h4>
          <p><strong>${exchange.toAmount} ${exchange.toCurrency}</strong> успешно переведены</p>
          
          ${exchange.destinationTransaction?.txId ? `
            <p><strong>ID транзакции:</strong> ${exchange.destinationTransaction.txId}</p>
          ` : ''}
          
          ${exchange.destinationTransaction?.bankReference ? `
            <p><strong>Номер банковского перевода:</strong> ${exchange.destinationTransaction.bankReference}</p>
          ` : ''}
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h4>Итог обмена:</h4>
          <p><strong>Получили от вас:</strong> ${exchange.fromAmount} ${exchange.fromCurrency}</p>
          <p><strong>Отправили вам:</strong> ${exchange.toAmount} ${exchange.toCurrency}</p>
          <p><strong>Курс обмена:</strong> ${exchange.exchangeRate}</p>
          <p><strong>Комиссия:</strong> ${exchange.feePercentage}% (${exchange.feeAmount} ${exchange.toCurrency})</p>
          <p><strong>Время обработки:</strong> ${this.getProcessingTime(exchange)}</p>
        </div>

        <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p>💡 <strong>Подсказка:</strong> Сохраните это письмо как подтверждение операции</p>
        </div>

        <p>Спасибо за использование LIRA Exchange!</p>
        <p>Будем рады видеть вас снова.</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6c757d; font-size: 12px;">
          Это автоматическое уведомление. Если у вас есть вопросы, свяжитесь с нашей поддержкой.
        </p>
      </div>
    `;

    const text = `
LIRA Exchange - Обмен завершен ✅

🎉 Обмен #${exchange._id.toString().substring(0, 8)} завершен успешно!

Ваши средства отправлены: ${exchange.toAmount} ${exchange.toCurrency}

${exchange.destinationTransaction?.txId ? `ID транзакции: ${exchange.destinationTransaction.txId}` : ''}
${exchange.destinationTransaction?.bankReference ? `Номер перевода: ${exchange.destinationTransaction.bankReference}` : ''}

Итог обмена:
- Получили: ${exchange.fromAmount} ${exchange.fromCurrency}
- Отправили: ${exchange.toAmount} ${exchange.toCurrency}
- Курс: ${exchange.exchangeRate}
- Комиссия: ${exchange.feePercentage}%
- Время обработки: ${this.getProcessingTime(exchange)}

Спасибо за использование LIRA Exchange!
    `;

    return await this.sendOrLog(userEmail, subject, html, text);
  }

  // Уведомление об ошибке в обмене
  async sendExchangeFailed(userEmail, exchange, reason = '') {
    const subject = `Обмен #${exchange._id.toString().substring(0, 8)} - требуется внимание`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">LIRA Exchange</h2>
        <h3 style="color: #dc3545;">⚠️ Проблема с обменом</h3>
        
        <div style="background: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p>К сожалению, возникла проблема с обменом #${exchange._id.toString().substring(0, 8)}</p>
          ${reason ? `<p><strong>Причина:</strong> ${reason}</p>` : ''}
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h4>Что происходит:</h4>
          <p>🔍 Наша команда изучает ситуацию</p>
          <p>📞 Мы свяжемся с вами в ближайшее время</p>
          <p>💰 Ваши средства в безопасности</p>
        </div>

        <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Нужна помощь прямо сейчас?</strong></p>
          <p>Свяжитесь с нашей поддержкой, указав ID обмена: <strong>${exchange._id.toString().substring(0, 8)}</strong></p>
        </div>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6c757d; font-size: 12px;">
          Это автоматическое уведомление. Мы работаем над решением проблемы.
        </p>
      </div>
    `;

    const text = `
LIRA Exchange - Проблема с обменом

⚠️ К сожалению, возникла проблема с обменом #${exchange._id.toString().substring(0, 8)}

${reason ? `Причина: ${reason}` : ''}

Что происходит:
🔍 Наша команда изучает ситуацию
📞 Мы свяжемся с вами в ближайшее время  
💰 Ваши средства в безопасности

Для помощи свяжитесь с поддержкой, указав ID: ${exchange._id.toString().substring(0, 8)}
    `;

    return await this.sendOrLog(userEmail, subject, html, text);
  }

  // Уведомление об одобрении KYC
  async sendKycApproved(userEmail, userName) {
    const subject = `KYC верификация одобрена ✅`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">LIRA Exchange</h2>
        <h3 style="color: #28a745;">🎉 KYC верификация одобрена!</h3>
        
        <div style="background: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p>Поздравляем, <strong>${userName}</strong>!</p>
          <p>Ваши документы успешно прошли проверку.</p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h4>Теперь вам доступно:</h4>
          <p>✅ Увеличенные лимиты на обмен</p>
          <p>✅ Приоритетная обработка заявок</p>
          <p>✅ Доступ ко всем функциям платформы</p>
        </div>

        <p>Спасибо за доверие к LIRA Exchange!</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6c757d; font-size: 12px;">
          Это автоматическое уведомление.
        </p>
      </div>
    `;

    const text = `
LIRA Exchange - KYC одобрена ✅

🎉 Поздравляем, ${userName}!
Ваша KYC верификация одобрена.

Теперь доступно:
✅ Увеличенные лимиты
✅ Приоритетная обработка
✅ Все функции платформы

Спасибо за доверие!
    `;

    return await this.sendOrLog(userEmail, subject, html, text);
  }

  // Уведомление об отклонении KYC
  async sendKycRejected(userEmail, userName, reason) {
    const subject = `KYC верификация - требуются уточнения`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">LIRA Exchange</h2>
        <h3 style="color: #ffc107;">📋 Требуются уточнения по KYC</h3>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p>Здравствуйте, <strong>${userName}</strong>!</p>
          <p>К сожалению, предоставленные документы требуют уточнения.</p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h4>Причина:</h4>
          <p>${reason}</p>
        </div>

        <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Что делать:</strong></p>
          <p>1. Ознакомьтесь с причиной отклонения</p>
          <p>2. Подготовьте исправленные документы</p>
          <p>3. Загрузите их заново в личном кабинете</p>
        </div>

        <p>Мы готовы помочь с процессом верификации. Обращайтесь в поддержку при необходимости.</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #6c757d; font-size: 12px;">
          Это автоматическое уведомление.
        </p>
      </div>
    `;

    const text = `
LIRA Exchange - KYC требует уточнений

📋 Здравствуйте, ${userName}!
Предоставленные документы требуют уточнения.

Причина: ${reason}

Что делать:
1. Ознакомьтесь с причиной
2. Подготовьте исправленные документы  
3. Загрузите их в личном кабинете

Обращайтесь в поддержку при необходимости.
    `;

    return await this.sendOrLog(userEmail, subject, html, text);
  }

  // Вспомогательная функция для расчета времени обработки
  getProcessingTime(exchange) {
    if (!exchange.completedAt || !exchange.createdAt) return 'неизвестно';
    
    const diffMs = new Date(exchange.completedAt) - new Date(exchange.createdAt);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} мин`;
    } else {
      return `${diffHours} ч ${diffMins % 60} мин`;
    }
  }
}

// Экспортируем единственный экземпляр
module.exports = new EmailService(); 
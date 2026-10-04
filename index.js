const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json({ limit: '10mb' }));
let onlineCount = 0;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <title>دردشة الأصدقاء</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; }
          body { font-family: sans-serif; margin: 0; padding: 0; background: #111b21; color: #e9edef; display: flex; flex-direction: column; height: 100vh; }
          header { background: #202c33; padding: 15px; text-align: center; font-size: 1.1rem; font-weight: bold; color: #00a884; border-bottom: 1px solid #2a3942; display: flex; justify-content: space-between; align-items: center; }
          #call-btn { background: #00a884; color: white; border: none; padding: 6px 12px; border-radius: 12px; cursor: pointer; font-weight: bold; }
          #typing-status { font-size: 0.75rem; color: #00a884; font-style: italic; }
          #messages { list-style-type: none; margin: 0; padding: 20px; flex-grow: 1; overflow-y: auto; background: #111b21; }
          li { padding: 10px 14px; margin-bottom: 12px; border-radius: 8px; background: #202c33; width: fit-content; max-width: 75%; }
          li.me { background: #005c4b; margin-right: auto; margin-left: 0; }
          .sender-name { font-size: 0.85rem; color: #34b7f1; font-weight: bold; display: block; }
          .msg-text { font-size: 1rem; word-break: break-word; }
          .msg-image { max-width: 100%; border-radius: 8px; margin-top: 5px; display: block; max-height: 200px; }
          #form { display: flex; padding: 10px; background: #202c33; border-top: 1px solid #2a3942; align-items: center; }
          #input { flex-grow: 1; border: none; padding: 12px 18px; border-radius: 24px; outline: none; background: #2a3942; color: white; }
          button.send-btn { background: #00a884; color: white; border: none; padding: 12px 20px; margin-right: 8px; border-radius: 24px; cursor: pointer; font-weight: bold; }
          #emoji-btn, #file-btn { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #8696a0; padding: 0 5px; }
          #emoji-box { display: none; position: absolute; bottom: 70px; right: 10px; background: #2a3942; padding: 10px; border-radius: 8px; max-width: 250px; flex-wrap: wrap; gap: 5px; }
          .emoji { cursor: pointer; font-size: 1.3rem; }
          #file-input { display: none; }
        </style>
      </head>
      <body>
        <header>
          <span>💬 دردشة الأصدقاء السرية</span>
          <div>
            <button id="call-btn">📞 مكالمة</button>
            <span style="font-size:0.8rem; color:#34b7f1; margin-right:10px;">المتصلون: <b id="count">1</b></span>
          </div>
          <div id="typing-status"></div>
        </header>
        <ul id="messages"></ul>
        <div id="emoji-box">
          <span class="emoji">😀</span><span class="emoji">😂</span><span class="emoji">🤣</span><span class="emoji">😍</span>
          <span class="emoji">👍</span><span class="emoji">🔥</span><span class="emoji">🎉</span><span class="emoji">❤️</span>
        </div>
        <form id="form" action="">
          <button type="button" id="emoji-btn">😀</button>
          <button type="button" id="file-btn">📎</button>
          <input type="file" id="file-input" accept="image/*" />
          <input id="input" autocomplete="off" placeholder="اكتب رسالة..." />
          <button class="send-btn">إرسال</button>
        </form>
        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          const msgIn = new Audio('https://mixkit.co');
          const msgOut = new Audio('https://mixkit.co');
          const keyClick = new Audio('https://mixkit.co');
          keyClick.volume = 0.2;

          let name = sessionStorage.getItem('chat_name') || prompt("أدخل اسمك:") || "مجهول";
          sessionStorage.setItem('chat_name', name);

          const form = document.getElementById('form');
          const input = document.getElementById('input');
          const messages = document.getElementById('messages');
          const countDisplay = document.getElementById('count');
          const emojiBtn = document.getElementById('emoji-btn');
          const emojiBox = document.getElementById('emoji-box');
          const fileBtn = document.getElementById('file-btn');
          const fileInput = document.getElementById('file-input');
          const typingStatus = document.getElementById('typing-status');
          const callBtn = document.getElementById('call-btn');

          let tTimeout;
          input.addEventListener('input', () => {
            keyClick.currentTime = 0; keyClick.play().catch(e=>{});
            socket.emit('typing', { name: name, isTyping: true });
            clearTimeout(tTimeout);
            tTimeout = setTimeout(() => socket.emit('typing', { name: name, isTyping: false }), 1500);
          });

          socket.on('display typing', (data) => {
            if (data.isTyping && data.name !== name) {
              typingStatus.textContent = data.name + ' يكتب...';
              typingStatus.style.display = 'block';
            } else { typingStatus.style.display = 'none'; }
          });

          fileBtn.addEventListener('click', () => fileInput.click());
          fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
              const r = new FileReader();
              r.onload = function(ev) {
                socket.emit('chat message', { name: name, text: '', image: ev.target.result });
              };
              r.readAsDataURL(file);
            }
          });

          emojiBtn.addEventListener('click', () => emojiBox.style.display = emojiBox.style.display === 'flex' ? 'none' : 'flex');
          document.querySelectorAll('.emoji').forEach(el => {
            el.addEventListener('click', () => { input.value += el.textContent; emojiBox.style.display = 'none'; input.focus(); });
          });

          form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (input.value) {
              socket.emit('chat message', { name: name, text: input.value, image: null });
              msgOut.play().catch(e=>{});
              input.value = '';
              socket.emit('typing', { name: name, isTyping: false });
            }
          });

          socket.on('chat message', (data) => {
            const item = document.createElement('li');
            if (data.name === name) item.classList.add('me'); else msgIn.play().catch(e=>{});
            let c = '<span class="sender-name">' + data.name + '</span>';
            if (data.text) c += '<span class="msg-text">' + data.text + '</span>';
            if (data.image) c += '<img src="' + data.image + '" class="msg-image" />';
            item.innerHTML = c; messages.appendChild(item); messages.scrollTop = messages.scrollHeight;
          });

          socket.on('update users', (count) => countDisplay.textContent = count);

          callBtn.addEventListener('click', () => {
            alert('جاري بدء اتصال آمن.. اطلب من أصدقائك الضغط على زر مكالمة للربط معك.');
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
              callBtn.style.background = '#ea0038'; callBtn.textContent = '🛑 إنهاء';
            }).catch(e => alert('يرجى تفعيل المايك'));
          });
        </script>
      </body>
    </html>
  `);
});

io.on('connection', (socket) => {
  onlineCount++; io.emit('update users', onlineCount);
  socket.on('chat message', (data) => io.emit('chat message', data));
  socket.on('typing', (data) => io.emit('display typing', data));
  socket.on('disconnect', () => { onlineCount--; io.emit('update users', onlineCount); });
});

http.listen(process.env.PORT || 3000);

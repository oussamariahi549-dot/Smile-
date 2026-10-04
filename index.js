const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// زيادة حجم الملفات المسموح بها إلى 10 ميجابايت لإرسال الصور براحة
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

let onlineCount = 0;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <title>غرفة دردشة الأصدقاء</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; background: #111b21; color: #e9edef; display: flex; flex-direction: column; height: 100vh; }
          header { background: #202c33; padding: 15px; text-align: center; font-size: 1.2rem; font-weight: bold; color: #00a884; border-bottom: 1px solid #2a3942; display: flex; justify-content: space-between; align-items: center; position: relative; }
          #online-status { font-size: 0.85rem; background: #2a3942; padding: 4px 10px; border-radius: 12px; color: #34b7f1; }
          #typing-status { position: absolute; bottom: -20px; right: 20px; font-size: 0.75rem; color: #00a884; font-style: italic; display: none; z-index: 10; }
          #messages { list-style-type: none; margin: 0; padding: 20px; flex-grow: 1; overflow-y: auto; background: #111b21; padding-top: 30px; }
          li { padding: 10px 14px; margin-bottom: 12px; border-radius: 8px; background: #202c33; width: fit-content; max-width: 75%; box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
          li.me { background: #005c4b; margin-right: auto; margin-left: 0; }
          .sender-name { font-size: 0.85rem; color: #34b7f1; font-weight: bold; margin-bottom: 4px; display: block; }
          li.me .sender-name { color: #53bdeb; }
          .msg-text { font-size: 1rem; word-break: break-word; }
          .msg-image { max-width: 100%; border-radius: 8px; margin-top: 5px; display: block; max-height: 250px; object-fit: contain; }
          .msg-time { font-size: 0.7rem; color: #8696a0; margin-top: 4px; text-align: left; display: block; }
          #form { display: flex; padding: 10px; background: #202c33; border-top: 1px solid #2a3942; align-items: center; position: relative; }
          #input { flex-grow: 1; border: none; padding: 12px 18px; border-radius: 24px; outline: none; background: #2a3942; color: white; font-size: 1rem; }
          button { background: #00a884; color: white; border: none; padding: 12px 25px; margin-right: 8px; border-radius: 24px; cursor: pointer; font-size: 1rem; font-weight: bold; }
          #emoji-btn, #file-btn { background: none; border: none; font-size: 1.4rem; cursor: pointer; padding: 0 8px; margin: 0; color: #8696a0; }
          #emoji-btn:hover, #file-btn:hover { color: #e9edef; }
          #emoji-box { display: none; position: absolute; bottom: 70px; right: 10px; background: #2a3942; padding: 10px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.5); max-width: 250px; flex-wrap: wrap; gap: 5px; z-index: 100; }
          .emoji { font-size: 1.3rem; cursor: pointer; transition: transform 0.1s; }
          .emoji:hover { transform: scale(1.2); }
          #file-input { display: none; }
        </style>
      </head>
      <body>
        <header>
          <span>💬 دردشة الأصدقاء السرية</span>
          <span id="online-status">المتصلون الآن: <b id="count">1</b></span>
          <div id="typing-status"></div>
        </header>
        
        <ul id="messages"></ul>
        
        <div id="emoji-box">
          <span class="emoji">😀</span><span class="emoji">😂</span><span class="emoji">🤣</span><span class="emoji">😍</span>
          <span class="emoji">👍</span><span class="emoji">🔥</span><span class="emoji">🎉</span><span class="emoji">❤️</span>
          <span class="emoji">😎</span><span class="emoji">😉</span><span class="emoji">👏</span><span class="emoji">💀</span>
        </div>

        <form id="form" action="">
          <button type="button" id="emoji-btn">😀</button>
          <button type="button" id="file-btn">📎</button>
          <input type="file" id="file-input" accept="image/*" />
          <input id="input" autocomplete="off" placeholder="اكتب رسالة..." />
          <button>إرسال</button>
        </form>

        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          const audio = new Audio('https://mixkit.co');

          let name = sessionStorage.getItem('chat_name');
          if (!name) {
            name = prompt("من فضلك أدخل اسمك للدردشة:") || "مجهول";
            sessionStorage.setItem('chat_name', name);
          }
          
          const form = document.getElementById('form');
          const input = document.getElementById('input');
          const messages = document.getElementById('messages');
          const countDisplay = document.getElementById('count');
          const emojiBtn = document.getElementById('emoji-btn');
          const emojiBox = document.getElementById('emoji-box');
          const fileBtn = document.getElementById('file-btn');
          const fileInput = document.getElementById('file-input');
          const typingStatus = document.getElementById('typing-status');

          let typingTimeout;

          // إرسال حالة "يكتب الآن" عند إدخال نص
          input.addEventListener('input', () => {
            socket.emit('typing', { name: name, isTyping: true });
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
              socket.emit('typing', { name: name, isTyping: false });
            }, 2000);
          });

          // استقبال حالة الكتابة من الأصدقاء
          socket.on('display typing', (data) => {
            if (data.isTyping && data.name !== name) {
              typingStatus.textContent = data.name + ' يكتب الآن...';
              typingStatus.style.display = 'block';
            } else {
              typingStatus.style.display = 'none';
            }
          });

          // فتح تصفح الملفات عند الضغط على المشبك
          fileBtn.addEventListener('click', () => fileInput.click());

          // معالجة وإرسال الصورة المقروءة
          fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = function(event) {
                const time = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                socket.emit('chat message', { name: name, text: '', image: event.target.result, time: time });
              };
              reader.readAsDataURL(file);
            }
          });

          emojiBtn.addEventListener('click', () => {
            emojiBox.style.display = emojiBox.style.display === 'flex' ? 'none' : 'flex';
          });

          document.querySelectorAll('.emoji').forEach(el => {
            el.addEventListener('click', () => {
              input.value += el.textContent;
              input.focus();
              emojiBox.style.display = 'none';
            });
          });

          form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (input.value) {
              const time = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
              socket.emit('chat message', { name: name, text: input.value, image: null, time: time });
              input.value = '';
              socket.emit('typing', { name: name, isTyping: false });
            }
          });

          socket.on('chat message', (data) => {
            const item = document.createElement('li');
            if (data.name === name) item.classList.add('me');
            else audio.play().catch(e => console.log('Audio error'));
            
            let content = '<span class="sender-name">' + data.name + '</span>';
            if (data.text) content += '<span class="msg-text">' + data.text + '</span>';
            if (data.image) content += '<img src="' + data.image + '" class="msg-image" />';
            content += '<span class="msg-time">' + data.time + '</span>';
            
            item.innerHTML = content;
            messages.appendChild(item);
            messages.scrollTop = messages.scrollHeight;
          });

          socket.on('update users', (count) => {
            countDisplay.textContent = count;
          });
        </script>
      </body>
    </html>
  `);
});

io.on('connection', (socket) => {
  onlineCount++;
  io.emit('update users', onlineCount);

  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });

  socket.on('typing', (data) => {
    io.emit('display typing', data);
  });

  socket.on('disconnect', () => {
    onlineCount--;
    io.emit('update users', onlineCount);
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log('Server is running');
});

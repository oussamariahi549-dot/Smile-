const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

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
          header { background: #202c33; padding: 15px; text-align: center; font-size: 1.2rem; font-weight: bold; color: #00a884; border-bottom: 1px solid #2a3942; }
          #messages { list-style-type: none; margin: 0; padding: 20px; flex-grow: 1; overflow-y: auto; background: #111b21; }
          li { padding: 10px 14px; margin-bottom: 12px; border-radius: 8px; background: #202c33; width: fit-content; max-width: 75%; box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
          li.me { background: #005c4b; margin-right: auto; margin-left: 0; }
          .sender-name { font-size: 0.85rem; color: #34b7f1; font-weight: bold; margin-bottom: 4px; display: block; }
          .msg-text { font-size: 1rem; word-break: break-word; }
          #form { display: flex; padding: 10px; background: #202c33; border-top: 1px solid #2a3942; }
          #input { flex-grow: 1; border: none; padding: 12px 18px; border-radius: 24px; outline: none; background: #2a3942; color: white; font-size: 1rem; }
          button { background: #00a884; color: white; border: none; padding: 0 25px; margin-right: 8px; border-radius: 24px; cursor: pointer; font-size: 1rem; font-weight: bold; }
        </style>
      </head>
      <body>
        <header>💬 غرفة دردشة الأصدقاء السرية</header>
        <ul id="messages"></ul>
        <form id="form" action="">
          <input id="input" autocomplete="off" placeholder="اكتب رسالة..." /><button>إرسال</button>
        </form>
        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          let name = sessionStorage.getItem('chat_name') || prompt("أدخل اسمك للدردشة:") || "مجهول";
          sessionStorage.setItem('chat_name', name);
          
          const form = document.getElementById('form');
          const input = document.getElementById('input');
          const messages = document.getElementById('messages');

          form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (input.value) {
              socket.emit('chat message', { name: name, text: input.value });
              input.value = '';
            }
          });

          socket.on('chat message', (data) => {
            const item = document.createElement('li');
            if (data.name === name) item.classList.add('me');
            item.innerHTML = '<span class="sender-name">' + data.name + '</span><span class="msg-text">' + data.text + '</span>';
            messages.appendChild(item);
            messages.scrollTop = messages.scrollHeight;
          });
        </script>
      </body>
    </html>
  `);
});

io.on('connection', (socket) => {
  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log('Server is running on port 3500');
});

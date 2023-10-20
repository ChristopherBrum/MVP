////////// Connecto to EC2 instance //////////
// Connect to the Socket.IO server
// const socket = io('44.212.23.240:3001');

// -----  atLeastOnce logic
const socket = io('http://localhost:3001', {
  auth: {
    sessionId: localStorage.getItem("sessionId") || undefined,
    offset: localStorage.getItem("offset") || undefined,
  }
});

// Handle successful connection
socket.on("message", (messageData) => {
  console.log('MessageData from client', messageData);
  let [msg, timestamp] = messageData;

  socket.auth.offset = timestamp; // atLeastOnce logic
  localStorage.setItem("offset", timestamp);
  console.log('Socket offset', socket.auth.offset)

  const messages = document.getElementById('messages');
  const item = document.createElement('li');
  item.textContent = msg["message"];
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});

// session listener emitted upon user connecting for the first time
socket.on("session", ({ sessionId }) => {
  socket.auth = { sessionId };
  localStorage.setItem("sessionId", sessionId);
})

const disconnectBtn = document.getElementById('disconnect');
disconnectBtn.addEventListener('click', (e) => {
  e.preventDefault();
  socket.disconnect();
  if (socket.auth.offset) {
    console.log('client-side offset upon disconnect', socket.auth.offset)
  }
  setTimeout(() => {
    socket.connect();
  }, 7000)
});

// socket.on("disconnect", (reason) => {
//   if (reason === "io server disconnect") {
//     // the disconnection was initiated by the server, you need to reconnect manually
//     socket.connect();
//   }
//   // else the socket will automatically try to reconnect
// });

// fires event when a room is selected from the dropdown

document.addEventListener('DOMContentLoaded', () => {
  const options = document.getElementById('options');

  options.addEventListener('change', () => {
    const selectedOption = options.value;

    // join room <button value> on change event
    // server then emits back to roomJoined (below)
    socket.emit('join', `${selectedOption}`);
  });
});

socket.on('roomJoined', (message) => {
  console.log(message);
});

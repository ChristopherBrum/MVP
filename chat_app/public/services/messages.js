// Connect to the Socket.IO server
const socket = io('http://localhost:3001');

// Handle successful connection
socket.on("message", (msg) => {
  console.log(msg);
  const item = document.createElement('li');
  item.textContent = msg["hi"];
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});

// socket.on("message", (msg) => {
//   console.log(msg);
//   const item = document.createElement('li');
//   item.textContent = msg["hi"];
//   messages.appendChild(item);
//   window.scrollTo(0, document.body.scrollHeight);
// });

// // const form = document.getElementById('form');
// // const input = document.getElementById('input');
// const messages = document.getElementById('messages');

// // we don't need this if we are only concerned about the client receiving what is published by backend services
// the client does not need to send data

const disconnectBtn = document.getElementById('disconnect');
disconnectBtn.addEventListener('click', (e) => {
	e.preventDefault();
	socket.disconnect();
	socket.connect();
});

// socket.on("disconnect", (reason) => {
//   if (reason === "io server disconnect") {
//     // the disconnection was initiated by the server, you need to reconnect manually
//     socket.connect();
//   }
//   // else the socket will automatically try to reconnect
// });
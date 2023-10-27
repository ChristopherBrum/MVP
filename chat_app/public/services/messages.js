////////// Connect to EC2 instance //////////
// Connect to the Socket.IO server
// const socket = io('44.212.23.240:3001');

const socket = io('http://localhost:3001');

// when the client connects
socket.on('connect', () => {
  // check for sessionId in local storage
  const sessionId = localStorage.getItem('twineSessionId');

  // send sessionId to server, whether sessionId is undefined or already set
  socket.emit('sessionId', sessionId);
});

// if first time connection, set sessionId in local storage
socket.on('setSessionId', (sessionId) => {
  console.log('client session event: ' + sessionId);
  localStorage.setItem('twineSessionId', sessionId);
})

// Handle successful connection
socket.on("message", (data) => {
  console.log('data from client', data);
  const messages = document.getElementById('messages');
  const item = document.createElement('li');
  item.textContent = data["message"];
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});

// temporary, for redis message emit
// socket.on("redismessage", (messageData) => {
//   console.log('MessageData for client: ', messageData);
//   let [message, room] = messageData;
//   let displayMsg = `${message} from room ${room}`
//   const messages = document.getElementById('messages');
//   const item = document.createElement('li');
//   item.textContent = displayMsg;
//   messages.appendChild(item);
//   window.scrollTo(0, document.body.scrollHeight);
// });

const disconnectBtn = document.getElementById('disconnect');
disconnectBtn.addEventListener('click', (e) => {
  e.preventDefault();
  socket.disconnect();
  setTimeout(() => {
    socket.connect();
  }, 10000)
});

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

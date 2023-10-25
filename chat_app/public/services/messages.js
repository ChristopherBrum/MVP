////////// Connecto to EC2 instance //////////
// Connect to the Socket.IO server
// const socket = io('44.212.23.240:3001');

const socket = io('http://localhost:3001', {
  auth: {
    offset: localStorage.getItem("offset") || Date.now(),
  }
});

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
socket.on("message", (messageData) => {
  console.log('MessageData from client', messageData);
  let [ payload, timestamp ] = messageData;

  socket.auth.offset = timestamp; // atLeastOnce logic
  localStorage.setItem("offset", timestamp);

  const messages = document.getElementById('messages');
  const item = document.createElement('li');
  item.textContent = payload["message"];
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});

const disconnectBtn = document.getElementById('disconnect');
disconnectBtn.addEventListener('click', (e) => {
  e.preventDefault();
  socket.disconnect();
  if (socket.auth.offset) {
    console.log('client-side offset upon disconnect', socket.auth.offset)
  }
  setTimeout(() => {
    socket.connect();
  }, 10000)
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

/*
------ atLeastOnceFunctionality
Need to track a users subscribed rooms to provide state recovery upon disconnect (both intentionally & unintentionally)

Updated state recovery approach: 
- Track timestamp of each room's last message
- Capture user's disconnect time
- Retrive messages from Redis/Dynamo based off difference


Store rooms, where? Redis sessions table


Upon connection, check Redis, 
- does user exist? 
  - no? initial connection
  - yes? how long have they been disconnected?
    - under 2min?
      - query Redis
    - otherwise
      - query Dynamo


When a user connects reconnects
- access localStorage to retreive rooms user is subscribed to
  - iterate thru rooms, for each room call #readPreviousMessages(room), an async Fn that will call
    - #readPreviousMessagesByRoom for each room, passing in the offset value from localStorage
      - the returned array of messages for the current room will be emitted using the #forEach method on lines 85-89


TODO ITEMS
- implement a function for both Redis & DynamoDB that captures the time in milliseconds

FURTHER QUESTIONS
- is the 'roomJoined' socket event handler needed in 'messages.js'?
- should we provide context (i.e. previous messages) for a user who's connecting for the first time? -> leave the choice up to the developer to implement w/ Twine client?

*/
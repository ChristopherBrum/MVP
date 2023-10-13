// Connect to the Socket.IO server
const socket = io('http://localhost:3001');

// Handle successful connection
socket.on("message", (msg) => {
	const item = document.createElement('li');
	item.textContent = msg;
	messages.appendChild(item);
	window.scrollTo(0, document.body.scrollHeight);
});

// socket.on('chat message', (msg) => {

// });

// // const form = document.getElementById('form');
// // const input = document.getElementById('input');
// const messages = document.getElementById('messages');

// // we don't need this if we are only concerned about the client receiving what is published by backend services
// // the client does not need to send data
// // form.addEventListener('submit', (e) => {
// // 	e.preventDefault();
// // 	if (input.value) {
// // 		socket.emit('chat message', input.value);
// // 		input.value = '';
// // 	}
// // });

// socket.on('connection', (msg) => {
// 	console.log('CONNECTION ACHIEVED!')
// });

// socket.on('chat message', (msg) => {
// 	const item = document.createElement('li');
// 	item.textContent = msg;
// 	messages.appendChild(item);
// 	window.scrollTo(0, document.body.scrollHeight);
// });

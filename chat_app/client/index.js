// const express = require('express');
// const { createServer } = require('node:http');
// const { join } = require('node:path');
// const { Server } = require('socket.io');

// const app = express();
// // const server = createServer(app);
// // const io = new Server(server);

// app.use('/public/css', (req, res, next) => {
// 	res.type('text/css');
// 	next();
// });

// app.use('/public', express.static('public'));

// // const PORT = 3000;

app.get('/', (req, res) => {
	res.sendFile(join(__dirname, 'index.html'));
});

// io.on('connection', (socket) => {
// 	console.log('a user connected');

// 	// event fored when `socket emit` is invoked in index.html
// 	socket.on('chat message', (msg) => {
// 		console.log('message:', msg);

// 		io.emit('chat message', msg);
// 	})

// 	// event fired when connection is lost
// 	socket.on('disconnect', () => {
// 		console.log('a user disconnected');
// 	})
// });

// server.listen(PORT, () => {
// 	console.log('listening on port', PORT);
// });
const {io} = require("socket.io-client")

const socket = io("https://localhost:3001")

socket.on("connect", () => {
  console.log(socket.connected);

// 	socket.on('chat message', (msg) => {
// 	const item = document.createElement('li');
// 	item.textContent = msg;
// 	messages.appendChild(item);
// 	window.scrollTo(0, document.body.scrollHeight);
// });

});



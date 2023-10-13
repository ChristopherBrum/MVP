// import { socket } from './socket';

const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

form.addEventListener('submit', (e) => {
	e.preventDefault();
	if (input.value) {
		socket.emit('chat message', input.value);
		input.value = '';
	}
});

socket.on('chat message', (msg) => {
	const item = document.createElement('li');
	item.textContent = msg;
	messages.appendChild(item);
	window.scrollTo(0, document.body.scrollHeight);
});

// import { io } from 'socket.io-client';

// // "undefined" means the URL will be computed from the `window.location` object
// const URL = 'http://localhost:3001';

// export const socket = io(URL);



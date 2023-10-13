const express = require('express');
const app = express();
const { join } = require('node:path');

const cors = require('cors');
app.use(cors());

// app.use('../public/css/main.css', (req, res, next) => {
// 	res.type('text/css');
// 	next();
// });

app.use(express.static('public'));

const PORT = 3002;

// app.get('/', (req, res) => {
// 	// res.sendFile(join(__dirname, 'index.js'));
// 	// res.sendFile(join(__dirname, '../../client/index.html'));
//   console.log("this route is being run")
// });

app.listen(PORT, () => {
	console.log('listening on port', PORT);
})
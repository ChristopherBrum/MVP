"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// const mongoose = require('mongoose');
const mongoose_1 = require("mongoose");
// const requestSchema = new mongoose.Schema({
const requestSchema = new mongoose_1.Schema({
    key: {
        type: String,
        required: true
    },
    header: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: false
    },
});
// requestSchema.set('toJSON', {
//   transform: (document, returnedObject) => {
//     returnedObject.id = returnedObject._id.toString()
//     delete returnedObject._id
//     delete returnedObject.__v
//   }
// })
const MgRequest = (0, mongoose_1.model)('MgRequest', requestSchema);
module.exports = MgRequest;
// module.exports = mongoose.model('Request', requestSchema)

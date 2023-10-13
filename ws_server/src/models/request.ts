const mongoose = require('mongoose');
import { Schema, model, connect } from 'mongoose';

interface IMgRequest {
  key: string;
  header: string;
  body: string;
}

// const requestSchema = new mongoose.Schema({
const requestSchema = new Schema<IMgRequest>({
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
})

// requestSchema.set('toJSON', {
//   transform: (document, returnedObject) => {
//     returnedObject.id = returnedObject._id.toString()
//     delete returnedObject._id
//     delete returnedObject.__v
//   }
// })

const MgRequest = model<IMgRequest>('MgRequest', requestSchema);

module.exports = MgRequest
// module.exports = mongoose.model('Request', requestSchema)
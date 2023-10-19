// const mongoose = require('mongoose');
import { Document, Schema, model } from 'mongoose';

interface RoomData {
  hi: string;
}

interface IMgRequest extends Document<any> {
  room: {
    roomName: string,
    roomData: RoomData
  },
}

// const requestSchema = new Schema<IMgRequest>({
//   room: {
//     type: Object,
//     required: true,
//   }
// })

// --- atLeastOnce logic
// creating a timestamp via Mongoose
const requestSchema = new Schema<IMgRequest>({
  room: {
    type: Object,
    required: true,
  }},
  { timestamps: true }, // creates timestamp
)

requestSchema.set('toJSON', {
  transform: (document: Document<any>, returnedObject: Document<any>) => {
    // returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const MgRequest = model<IMgRequest>('MgRequest', requestSchema);

module.exports = MgRequest

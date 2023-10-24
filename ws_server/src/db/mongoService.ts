// const mongoose = require('mongoose');
import { Date, Document } from "mongoose";
import pkg from "mongoose";
const { Schema, model } = pkg;

interface RoomData {
  message: string;
}

interface IMgRequest extends Document<any> {
  room: {
    roomName: string,
    roomData: RoomData
  },
  createdAt: Date,
  updatedAt: Date
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
  }
},
  { timestamps: true }, // creates timestamp
)

requestSchema.set('toJSON', {
  transform: (document: Document<any>, returnedObject: Document<any>) => {
    // returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

export const MgRequest = model<IMgRequest>('MgRequest', requestSchema);


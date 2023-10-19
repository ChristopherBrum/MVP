"use strict";
// export interface ServerToClientEvents {
//   noArg: () => void;
//   basicEmit: (a: number, b: string, c: Buffer) => void;
//   withAck: (d: string, callback: (e: number) => void) => void;
// }
// export interface RoomData {
//   hi: string;
// }
// export interface IMgRequest extends Document<any> {
//   room: {
//     roomName: string,
//     roomData: RoomData
//   },
// }
// export interface ClientToServerEvents {
//   hello: () => void;
//   message: (message: any[]) => void;
//   connect_message: (message: RoomData) => void;
//   session: (message: SessionObject) => void;
// }
// export interface InterServerEvents {
//   ping: () => void;
// }
// export interface SocketData {
//   name: string;
//   age: number;
//   sessionId: string;
//   offset: Date; // createdAt is a Mongoose prop of type Date
// }
// export interface SessionObject {
//   sessionId: string;

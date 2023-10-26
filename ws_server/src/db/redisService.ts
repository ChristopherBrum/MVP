import { Redis } from "ioredis"
import { getCurrentTimeStamp } from "../utils/helpers.js";
import "dotenv/config"

/*
'sessionIdString': 'timeStampString'

'sessionIdString' = {
  timestamp,
  room1,
  room2,
}

sessionIdString.room3 = undefined
sessionIdString.room2 = true
sessionIdString.timestamp = UTC time

if (reconnection) {
  checkLongOrShort(sessionId) {
    sessionIdString.timestamp - Date.now()
    if () {
      redis logic for state recovery
    } else {
      dynamo logic for state recovery
    }
  }
}

within 24hrs, ping Redis for sessionId
after 24hrs, ping Dynamo for sessionId


*/

const redisURL = process.env.CACHE_ENDPOINT || 'redis://localhost:6379';
const redis: Redis = new Redis(redisURL);
console.log('Connected to Redis');

// accepts array of strings
// check if key with that name already exists so we don't overwrite *
// creates rooms with the names of the strings in the arg array
// sets timeCreated based on cache's internal clock (consistent)
// sortedSetKey is a string of the name of the key of the room's eventual sorted set
export const createRoomHash = async (rooms: string[]) => {
  for (const room of rooms) {
    let redisTime = await redis.time();
    let timeCreated = redisTime.toString();
    let sortedSetKey = `${room}Set`
    console.log('String timestamp on new room hash: ' + timeCreated);
    let objStore = {
      timeCreated,
      sortedSetKey
    }
    await redis.hset(room, objStore);
  }
}


// room and payload must be extracted from the Postman request body then passed to this func as args
// the name of the room sent in the Postman request body must match a room key in Redis
// note: we should return 'room name < name >' does not exist error for Postman API
export const storeMessageInSet = async (room: string, payload: string) => {
  let timeCreated = getCurrentTimeStamp();
  await redis.zadd(`${room}Set`, timeCreated, payload);
}

// accepts three string args: room, time, limit
// time arg must match format of Redis timestamp; will be associated with user sessionID (not argument?)
// room arg must match a room key in Redis
// limit arg determines how many messages to retrieve from the timestamp
  // for pagination and overall efficiency, we should retrieve X amount at a time
    // to show next batch of missed messaged, can call this again with updated timestamp
export const retrieveMsgsByRoomAndTime = async (room: string, sessionID: string) => {
  let redisVal = await redis.get(sessionID);
  const timestamp: string = redisVal || "";

  // timestamp is minimum timestamp of the messages that we return
  redis.zrangebyscore(`${room}Set`, timestamp, '+inf', (error, result) => {
  if (error) {
    console.error('Error reading sorted set:', error);
  } else {
    console.log('Values of sorted set with scores greater than minTimestamp:', result);
  }
  })
}

// simple k/v pair: sessionID: timestamp
// issue global timestamp on heartbeat/disconnect/socket connection end that can be used for any room ??
// OR timestamp is specific to each room -- suboptimal; more complicated logic and more data to store
export const createSessionHash = async (sessionID: string) => {
  console.log('createSessionHash sessionID: ' + sessionID);
  const timestampInSeconds = getCurrentTimeStamp();
  redis.set(sessionID, timestampInSeconds);
  let zz = await redis.get(sessionID);
}

export const checkSessionTime = async (sessionID: string) => {
  let zz = await redis.get(sessionID);
  return zz;
}
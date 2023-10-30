import { redis } from "../index.js"
import { RedisKey } from "ioredis";

const THREE_MINUTES_AGO = Date.now() - 180000;

const getScoreOfItem = async (sortedSetKey: string, member: string) => {
  const score = await redis.zscore(sortedSetKey, member);
  return score;
}

const removeItemFromSortedSet = async (sortedSetKey: string, member: string) => {
  await redis.zrem(sortedSetKey, member)
}

export const messageCronJob = () => {

  // creates a redis stream to retrieve all sorted sets
  const stream = redis.scanStream({ type: "zset" });

  stream.on("data", (resultKeys) => {
    // allSortedSets is an array of all of the sorted sets in the Redis caches
    let allSortedSets = resultKeys;

    allSortedSets.forEach((set: string) => {
      // create a stream to iterate through the members of each sorted set
      const setStream = redis.zscanStream(set);

      setStream.on("data", (allMessages) => {

        // iterate through all the messages in each sorted set
        allMessages.forEach(async (msg: string) => {
          let score = await getScoreOfItem(set, msg);
          if (score && Number(score) < THREE_MINUTES_AGO) {
            await removeItemFromSortedSet(set, msg);
          }
        })

      });
    })
  });
};


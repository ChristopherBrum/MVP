import { redis } from "../index.js"

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
    console.log(allSortedSets); // ["BSet"]

    allSortedSets.forEach((set: string) => {
      // create a stream to iterate through the members of each sorted set
      const setStream = redis.zscanStream(set);

      setStream.on("data", (allMessages) => {
        console.log(allMessages); // Should output all messages & output scores as well

        // iterate through all the messages in each sorted set
        allMessages.forEach(async (msg: string) => {
          let score = await getScoreOfItem(set, msg);
          console.log("Msg with Score:", msg, score);

          if (score && (Number(score) < (Date.now() - 180000))) {
            await removeItemFromSortedSet(set, msg);
          }
        })

      });
    })
  });
};


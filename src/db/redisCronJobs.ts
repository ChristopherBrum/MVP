import { redis } from "../index.js";

const getScoreOfItem = async (sortedSetKey: string, member: string) => {
  const score = await redis.zscore(sortedSetKey, member);
  return score;
};

const removeItemFromSortedSet = async (sortedSetKey: string, member: string) => {
  await redis.zrem(sortedSetKey, member);
};

const findSortedSetsInCluster = async () => {
  let cursor = 0;
  const sortedSets = [];

  do {
    const [newCursor, keys] = await redis.scan(cursor);

    for (const key of keys) {
      const type = await redis.type(key);
      if (type === "zset") {
        sortedSets.push(key);
      }
    }

    cursor = Number(newCursor);
  } while (cursor !== 0);

  return sortedSets;
};

export const messageCronJob = async () => {
  console.log("Cron Job executed");

  let allSortedSets = await findSortedSetsInCluster();
  console.log(allSortedSets);

  allSortedSets.forEach((set: string) => {
    // create a stream to iterate through the members of each sorted set
    const setStream = redis.zscanStream(set);

    setStream.on("data", (allMessages) => {

      // iterate through all the messages in each sorted set
      allMessages.forEach(async (msg: string) => {
        let score = await getScoreOfItem(set, msg);
        if (score && (Number(score) < (Date.now() - 180000))) {
          await removeItemFromSortedSet(set, msg);
        }
      })
    });
  })
};

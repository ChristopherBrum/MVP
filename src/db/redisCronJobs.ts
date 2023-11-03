import { redis } from "../index.js";

class CronJobHandler {
  public static async messageCronJob() {
    console.log("Cron Job executed");

    let allSortedSets = await CronJobHandler.findSortedSetsInCluster();
    console.log(allSortedSets);

    allSortedSets.forEach((set: string) => {
      const setStream = redis.zscanStream(set);

      setStream.on("data", (allMessages) => {
        allMessages.forEach(async (msg: string) => {
          let score = await CronJobHandler.getScoreOfItem(set, msg);
          if (score && (Number(score) < (Date.now() - 180000))) {
            await CronJobHandler.removeItemFromSortedSet(set, msg);
          }
        })
      });
    })
  }

  private static async getScoreOfItem(sortedSetKey: string, member: string) {
    const score = await redis.zscore(sortedSetKey, member);
    return score;
  }

  private static async removeItemFromSortedSet(sortedSetKey: string, member: string) {
    await redis.zrem(sortedSetKey, member);
  }

  private static async findSortedSetsInCluster() {
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
  }
}

export default CronJobHandler;

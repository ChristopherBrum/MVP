var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { redis } from "../index.js";
class CronJonHandler {
    static messageCronJob() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Cron Job executed");
            let allSortedSets = yield CronJonHandler.findSortedSetsInCluster();
            console.log(allSortedSets);
            allSortedSets.forEach((set) => {
                // create a stream to iterate through the members of each sorted set
                const setStream = redis.zscanStream(set);
                setStream.on("data", (allMessages) => {
                    // iterate through all the messages in each sorted set
                    allMessages.forEach((msg) => __awaiter(this, void 0, void 0, function* () {
                        let score = yield CronJonHandler.getScoreOfItem(set, msg);
                        if (score && (Number(score) < (Date.now() - 180000))) {
                            yield CronJonHandler.removeItemFromSortedSet(set, msg);
                        }
                    }));
                });
            });
        });
    }
    static getScoreOfItem(sortedSetKey, member) {
        return __awaiter(this, void 0, void 0, function* () {
            const score = yield redis.zscore(sortedSetKey, member);
            return score;
        });
    }
    static removeItemFromSortedSet(sortedSetKey, member) {
        return __awaiter(this, void 0, void 0, function* () {
            yield redis.zrem(sortedSetKey, member);
        });
    }
    static findSortedSetsInCluster() {
        return __awaiter(this, void 0, void 0, function* () {
            let cursor = 0;
            const sortedSets = [];
            do {
                const [newCursor, keys] = yield redis.scan(cursor);
                for (const key of keys) {
                    const type = yield redis.type(key);
                    if (type === "zset") {
                        sortedSets.push(key);
                    }
                }
                cursor = Number(newCursor);
            } while (cursor !== 0);
            return sortedSets;
        });
    }
}
export default CronJonHandler;

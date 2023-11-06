var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { newUUID } from '../utils/helpers.js';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
export const setCookie = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cookies = req.headers.cookie || '';
    const cookiesObj = Object.fromEntries(cookies.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        return [name, value];
    }));
    if (!cookiesObj.twineid) {
        const sessionID = newUUID();
        res.cookie('twineid', sessionID, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: TWENTY_FOUR_HOURS
        });
        console.log('First cookie set ', sessionID);
        res.send('First cookie set');
    }
    else {
        console.log('Cookie already set');
        res.send('Cookie already set');
    }
});

import { Request, Response } from "express";
import { newUUID } from '../utils/helpers.js';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export const setCookie = async (req: Request, res: Response) => {
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
  } else {
    console.log('Cookie already set');
    res.send('Cookie already set');
  }
};
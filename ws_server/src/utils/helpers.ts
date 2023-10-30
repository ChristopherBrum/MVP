import { v4 as uuid4 } from 'uuid';
import { serialize, parse } from "cookie";

export const currentTimeStamp = () => {
  return Date.now();
}

export const newUUID = () => {
  return uuid4();
}

export const dayExpiraton = () => {
  const hourFromNow = new Date();
  hourFromNow.setHours(hourFromNow.getHours() + 24);
  return hourFromNow;
}

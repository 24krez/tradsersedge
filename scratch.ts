import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const tz = 'America/New_York';
const now = new Date();
const nyTime = toZonedTime(now, tz);

console.log('UTC now:', now.toISOString());
console.log('NY time:', nyTime.toString());

// create a date in NY time: today at 09:30
const nyStart = new Date(nyTime.getFullYear(), nyTime.getMonth(), nyTime.getDate(), 9, 30, 0);
// interpret that as NY timezone and convert to UTC
const utcStart = fromZonedTime(nyStart, tz);

console.log('NY Start Local obj:', nyStart.toString());
console.log('NY Start UTC obj:', utcStart.toISOString());

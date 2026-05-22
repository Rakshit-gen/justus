import { format, formatDistanceToNowStrict, isToday, isYesterday, isThisWeek } from 'date-fns';

export function formatMessageTime(date) {
  const d = new Date(date);
  return format(d, 'h:mm a');
}

export function formatDayDivider(date) {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return format(d, 'EEEE');
  return format(d, 'MMM d, yyyy');
}

export function formatLastSeen(date) {
  if (!date) return 'offline';
  const d = new Date(date);
  return `last seen ${formatDistanceToNowStrict(d, { addSuffix: true })}`;
}

export function formatSidebarTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return format(d, 'EEE');
  return format(d, 'MMM d');
}

export function sameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}

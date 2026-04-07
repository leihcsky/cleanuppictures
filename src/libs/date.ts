export function getBusinessDateString(date: Date = new Date()) {
  const timeZone = process.env.APP_TIMEZONE || process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Asia/Shanghai';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

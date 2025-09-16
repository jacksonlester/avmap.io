export function formatISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseISODate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00.000Z');
}

export function getCurrentISODate(): string {
  return formatISODate(new Date());
}

export function getCurrentISOTimestamp(): string {
  return new Date().toISOString();
}
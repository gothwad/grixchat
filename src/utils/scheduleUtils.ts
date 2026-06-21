export interface ChatTimeRestrictions {
  enabled: boolean;
  neverAllowed: boolean;
  allowedDays: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

interface LockState {
  isLocked: boolean;
  message: string;
}

export function evaluateChatLockState(restrictions: ChatTimeRestrictions | null | undefined): LockState {
  if (!restrictions || !restrictions.enabled) {
    return { isLocked: false, message: "" };
  }

  if (restrictions.neverAllowed) {
    return { isLocked: true, message: "Locked (Chat restricted indefinitely)" };
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  
  // Check day of week
  if (restrictions.allowedDays && restrictions.allowedDays.length > 0) {
    if (!restrictions.allowedDays.includes(currentDay)) {
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const allowedDayNames = restrictions.allowedDays.map(d => daysOfWeek[d].substring(0, 3)).join(', ');
      return { 
        isLocked: true, 
        message: `Locked (Allowed days: ${allowedDayNames})` 
      };
    }
  }

  // Check time of day
  if (restrictions.startTime && restrictions.endTime) {
    const [startH, startM] = restrictions.startTime.split(':').map(Number);
    const [endH, endM] = restrictions.endTime.split(':').map(Number);

    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    const startTimeMinutes = startH * 60 + startM;
    const endTimeMinutes = endH * 60 + endM;

    let isWithinTime = false;
    if (startTimeMinutes <= endTimeMinutes) {
      // Normal range, e.g. 09:00 to 17:00
      isWithinTime = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
    } else {
      // Overnight range, e.g. 22:00 to 06:00
      isWithinTime = currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes;
    }

    if (!isWithinTime) {
      return { 
        isLocked: true, 
        message: `Locked till time: ${restrictions.startTime} (Active window: ${restrictions.startTime} - ${restrictions.endTime})` 
      };
    }
  }

  return { isLocked: false, message: "" };
}

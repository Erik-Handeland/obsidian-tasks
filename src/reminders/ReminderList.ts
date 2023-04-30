import type { Moment } from 'moment';

//TODO erik-handeland: not used now, might want to give user ability to switch from 12 to 24 hour time
// would cause a breaking change if user has reminders set and switches from 12 to 24 hour time
// Either don't give them the option, option with a warning, or option with some kinda conversion?
export const reminderSettings = {
    notificationTitle: 'Task Reminders',
    enabled: true,
    dateTimeFormat: 'YYYY-MM-DD h:mm a',
    dailyReminderTime: '09:00 am',
    refreshInterval: 10 * 1000, // Miliseconds (> 60 seconds is not recommended)
};

export class ReminderList {
    public times: Moment[];

    constructor(times: Moment[] | null) {
        this.times = times ?? [];
    }

    public toString(): string {
        return this.times.map((reminder) => `${reminder.format(reminderSettings.dateTimeFormat)}`).join(', ');
    }
}
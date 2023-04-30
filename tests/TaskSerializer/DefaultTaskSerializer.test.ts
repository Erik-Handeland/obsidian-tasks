/**
 * @jest-environment jsdom
 */
import moment from 'moment';
import { Priority } from '../../src/Task';
import { type Settings, getSettings } from '../../src/Config/Settings';
import { DefaultTaskSerializer } from '../../src/TaskSerializer';
import { RecurrenceBuilder } from '../TestingTools/RecurrenceBuilder';
import { DEFAULT_SYMBOLS, type DefaultTaskSerializerSymbols } from '../../src/TaskSerializer/DefaultTaskSerializer';
import { TaskBuilder } from '../TestingTools/TaskBuilder';
import { Reminder, ReminderList } from '../../src/reminders/Reminder';

jest.mock('obsidian');
window.moment = moment;

type DefaultTaskSerializeSymbolMap = readonly {
    taskFormat: Settings['taskFormat'];
    symbols: DefaultTaskSerializerSymbols;
}[];
// A map that facilitates parameterizing the tests over symbols
const symbolMap: DefaultTaskSerializeSymbolMap = [{ taskFormat: 'tasksPluginEmoji', symbols: DEFAULT_SYMBOLS }];

describe.each(symbolMap)("DefaultTaskSerializer with '$taskFormat' symbols", ({ symbols }) => {
    const taskSerializer = new DefaultTaskSerializer(symbols);
    const serialize = taskSerializer.serialize.bind(taskSerializer);
    const deserialize = taskSerializer.deserialize.bind(taskSerializer);
    const { reminderSettings } = getSettings();
    const {
        startDateSymbol,
        createdDateSymbol,
        recurrenceSymbol,
        scheduledDateSymbol,
        dueDateSymbol,
        doneDateSymbol,
        reminderDateSymbol,
    } = symbols;

    describe('deserialize', () => {
        it('should parse an empty string', () => {
            const taskDetails = deserialize('');
            expect(taskDetails).toMatchTaskDetails({});
        });

        it.each([
            { what: 'startDate', symbol: startDateSymbol },
            { what: 'createdDate', symbol: createdDateSymbol },
            { what: 'scheduledDate', symbol: scheduledDateSymbol },
            { what: 'dueDate', symbol: dueDateSymbol },
            { what: 'doneDate', symbol: doneDateSymbol },
        ] as const)('should parse a $what', ({ what, symbol }) => {
            const taskDetails = deserialize(`${symbol} 2021-06-20`);
            expect(taskDetails).toMatchTaskDetails({ [what]: moment('2021-06-20', 'YYYY-MM-DD') });
        });

        it('should parse a priority', () => {
            const priorities = ['High', 'None', 'Medium', 'Low'] as const;
            for (const p of priorities) {
                const prioritySymbol = symbols.prioritySymbols[p];
                const priority = Priority[p];

                const taskDetails = deserialize(`${prioritySymbol}`);

                expect(taskDetails).toMatchTaskDetails({ priority });
            }
        });

        it('should parse a recurrence', () => {
            const taskDetails = deserialize(`${recurrenceSymbol} every day`);
            expect(taskDetails).toMatchTaskDetails({
                recurrence: new RecurrenceBuilder().rule('every day').build(),
            });
        });

        it('should parse tags', () => {
            const description = ' #hello #world #task';
            const taskDetails = deserialize(description);
            expect(taskDetails).toMatchTaskDetails({
                tags: ['#hello', '#world', '#task'],
                description,
            });
        });

        it('should parse a single reminder date', () => {
            const taskDetails = deserialize(`${reminderDateSymbol} 2021-06-20`);
            expect(taskDetails).toMatchTaskDetails({
                reminders: new ReminderList([new Reminder(moment('2021-06-20', reminderSettings.dateTimeFormat))]),
            });
        });

        it('should parse a single reminder date time', () => {
            const taskDetails = deserialize(`${reminderDateSymbol} 2021-06-20 10:00 am`);
            expect(taskDetails).toMatchTaskDetails({
                reminders: new ReminderList([
                    new Reminder(moment('2021-06-20 10:00 am', reminderSettings.dateTimeFormat)),
                ]),
            });
        });

        it('should parse a multiple reminder string', () => {
            const taskDetails = deserialize(`${reminderDateSymbol} 2021-06-20 10:00 am, 2021-06-21`);
            expect(taskDetails).toMatchTaskDetails({
                reminders: new ReminderList([
                    new Reminder(moment('2021-06-20 10:00 am', reminderSettings.dateTimeFormat)),
                    new Reminder(moment('2021-06-21', reminderSettings.dateTimeFormat)),
                ]),
            });
        });
    });

    describe('serialize', () => {
        it('should serialize an "Empty" Task as the empty string', () => {
            const serialized = serialize(new TaskBuilder().description('').build());
            expect(serialized).toEqual('');
        });

        it.each([
            { what: 'startDate', symbol: startDateSymbol },
            { what: 'createdDate', symbol: createdDateSymbol },
            { what: 'scheduledDate', symbol: scheduledDateSymbol },
            { what: 'dueDate', symbol: dueDateSymbol },
            { what: 'doneDate', symbol: doneDateSymbol },
        ] as const)('should serialize a $what', ({ what, symbol }) => {
            const serialized = serialize(new TaskBuilder()[what]('2021-06-20').description('').build());
            expect(serialized).toEqual(` ${symbol} 2021-06-20`);
        });

        it('should serialize a High, Medium and Low priority', () => {
            const priorities = ['High', 'Medium', 'Low'] as const;
            for (const p of priorities) {
                const task = new TaskBuilder().priority(Priority[p]).description('').build();
                const serialized = serialize(task);
                expect(serialized).toEqual(` ${symbols.prioritySymbols[p]}`);
            }
        });

        it('should serialize a None priority', () => {
            const task = new TaskBuilder().priority(Priority.None).description('').build();
            const serialized = serialize(task);
            expect(serialized).toEqual('');
        });

        it('should serialize a recurrence', () => {
            const task = new TaskBuilder()
                .recurrence(new RecurrenceBuilder().rule('every day').build())
                .description('')
                .build();
            const serialized = serialize(task);
            expect(serialized).toEqual(` ${recurrenceSymbol} every day`);
        });

        it('should serialize tags', () => {
            const task = new TaskBuilder().description('').tags(['#hello', '#world', '#task']).build();
            const serialized = serialize(task);
            expect(serialized).toEqual(' #hello #world #task');
        });

        it('should serialize a single reminder date', () => {
            const serialized = serialize(new TaskBuilder().reminders(['2021-06-20']).description('').build());
            expect(serialized).toEqual(` ${reminderDateSymbol} 2021-06-20`);
        });

        it('should serialize a single reminder date time', () => {
            const serialized = serialize(new TaskBuilder().reminders(['2021-06-20 5:00 pm']).description('').build());
            expect(serialized).toEqual(` ${reminderDateSymbol} 2021-06-20 5:00 pm`);
        });

        it('should serialize a multiple reminder dates', () => {
            const serialized = serialize(
                new TaskBuilder().reminders(['2021-06-20 5:00 pm', '2021-06-21']).description('').build(),
            );
            expect(serialized).toEqual(` ${reminderDateSymbol} 2021-06-20 5:00 pm, 2021-06-21`);
        });
    });
});

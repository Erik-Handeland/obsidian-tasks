import type { Moment } from 'moment';
import type { Task } from '../../Task';
import { DateParser } from '../DateParser';
import { Explanation } from '../Explain/Explanation';
import type { Comparator } from '../Sorter';
import { compareByDate } from '../../lib/DateTools';
import { Field } from './Field';
import { Filter, FilterOrErrorMessage } from './Filter';
import { FilterInstructions } from './FilterInstructions';

/**
 * DateField is an abstract base class to help implement
 * all the filter instructions that act on a single type of date
 * value, such as the done date.
 */
export abstract class DateField extends Field {
    private readonly filterInstructions: FilterInstructions;

    constructor() {
        super();
        this.filterInstructions = new FilterInstructions();
        this.filterInstructions.add(`has ${this.fieldName()} date`, (task: Task) => this.date(task) !== null);
        this.filterInstructions.add(`no ${this.fieldName()} date`, (task: Task) => this.date(task) === null);
        this.filterInstructions.add(`${this.fieldName()} date is invalid`, (task: Task) => {
            const date = this.date(task);
            return date !== null && !date.isValid();
        });
    }

    public canCreateFilterForLine(line: string): boolean {
        if (this.filterInstructions.canCreateFilterForLine(line)) {
            return true;
        }

        return super.canCreateFilterForLine(line);
    }

    public createFilterOrErrorMessage(line: string): FilterOrErrorMessage {
        const filterResult = this.filterInstructions.createFilterOrErrorMessage(line);
        if (filterResult.filter !== undefined) {
            return filterResult;
        }

        const result = new FilterOrErrorMessage(line);

        const fieldNameKeywordDate = Field.getMatch(this.filterRegExp(), line);
        let filterFunction;
        if (fieldNameKeywordDate !== null) {
            const fieldKeyword = fieldNameKeywordDate[1];
            const fieldDate = DateParser.parseDate(fieldNameKeywordDate[2]);
            if (!fieldDate.isValid()) {
                result.error = 'do not understand ' + this.fieldName() + ' date';
            } else {
                if (fieldKeyword === 'before') {
                    filterFunction = (task: Task) => {
                        const date = this.date(task);
                        return date ? date.isBefore(fieldDate) : this.filterResultIfFieldMissing();
                    };
                } else if (fieldKeyword === 'after') {
                    filterFunction = (task: Task) => {
                        const date = this.date(task);
                        return date ? date.isAfter(fieldDate) : this.filterResultIfFieldMissing();
                    };
                } else {
                    filterFunction = (task: Task) => {
                        const date = this.date(task);
                        return date ? date.isSame(fieldDate) : this.filterResultIfFieldMissing();
                    };
                }

                const explanation = DateField.getExplanationString(
                    this.fieldName(),
                    fieldKeyword,
                    this.filterResultIfFieldMissing(),
                    fieldDate,
                );
                result.filter = new Filter(line, filterFunction, new Explanation(explanation));
            }
        } else {
            result.error = 'do not understand query filter (' + this.fieldName() + ' date)';
        }
        return result;
    }

    /**
     * Return the task's value for this date field, if any.
     * @param task - a Task object
     * @public
     */
    public abstract date(task: Task): Moment | null;

    /**
     * Construct a string used to explain a date-based filter
     * @param fieldName - for example, 'due'
     * @param relationshipPrefixedWithSpace - for example ' before' or ''
     * @param filterResultIfFieldMissing - whether the search matches tasks without the requested date value
     * @param filterDate - the date used in the filter
     */
    public static getExplanationString(
        fieldName: string,
        fieldKeyword: string,
        filterResultIfFieldMissing: boolean,
        filterDate: moment.Moment,
    ) {
        let relationship;
        switch (fieldKeyword) {
            case 'before':
            case 'after':
                relationship = fieldKeyword;
                break;
            default:
                relationship = 'on';
                break;
        }
        // Example of formatted date: '2024-01-02 (Tuesday 2nd January 2024)'
        const actualDate = filterDate.format('YYYY-MM-DD (dddd Do MMMM YYYY)');
        let result = `${fieldName} date is ${relationship} ${actualDate}`;
        if (filterResultIfFieldMissing) {
            result += ` OR no ${fieldName} date`;
        }
        return result;
    }

    /**
     * Determine whether a task that does not have the particular date value
     * should be treated as a match. For example, 'starts' searches match all tasks
     * that have no start date, which behaves differently from 'due', 'done' and
     * 'scheduled' searches.
     * @protected
     */
    protected abstract filterResultIfFieldMissing(): boolean;

    public supportsSorting(): boolean {
        return true;
    }

    public comparator(): Comparator {
        return (a: Task, b: Task) => {
            return compareByDate(this.date(a), this.date(b));
        };
    }
}

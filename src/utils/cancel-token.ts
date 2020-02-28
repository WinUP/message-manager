/**
 * Cancelled event
 */
export class CancelToken {
    /**
     * Should the event be cancelled
     */
    public get cancelled(): boolean {
        return this._cancelled;
    }

    private _cancelled: boolean = false;

    /**
     * Cancel this token
     */
    public cancel(): void {
        this._cancelled = true;
    }
}

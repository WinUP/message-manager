export enum InjectorTimepoint {
    AfterPrepared = 1,
    BeforeSend    = 1 << 1,
    AfterSent     = 1 << 2,
    OnSucceed     = 1 << 3,
    OnFailed      = 1 << 4
}

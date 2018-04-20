export enum InjectorTimepoint {
    AfterPrepared = 0B1,
    BeforeSend    = 0B10,
    AfterSent     = 0B100,
    OnSucceed     = 0B1000,
    OnFailed      = 0B10000
}

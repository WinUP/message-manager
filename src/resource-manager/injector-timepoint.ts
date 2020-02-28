export enum InjectorTimepoint {
    BeforeSend = 1,
    OnSucceed  = 1 << 1,
    OnFailed   = 1 << 2
}

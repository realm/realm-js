// Timer related stuff
type TimerHandler = string | Function;
declare function setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
declare function setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
declare function clearInterval(handle?: number): void;
declare function clearTimeout(handle?: number): void;

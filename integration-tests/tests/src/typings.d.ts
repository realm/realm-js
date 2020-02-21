interface fs {
    exists: (path: string) => boolean;
}

interface path {
    dirname: (path: string) => string;
    resolve: (basePath: string, path?: string) => string;
}

type Require = (id: string) => any;

type Environment = { [key: string]: string };

type SetTimeout = (handler: Function, timeout?: number, ...arguments: any[]) => number;
type ClearTimeout = (handle: number) => void;

interface Global extends NodeJS.Global {
    Realm: Realm;
    title: string;
    fs: fs;
    path: path;
    environment: Environment;
    require: Require;
    setTimeout: SetTimeout;
    clearTimeout: ClearTimeout;
}

declare var global: Global;
declare var fs: fs;
declare var path: path;
declare var require: Require;
declare var environment: Environment;
declare var setTimeout: SetTimeout;
declare var clearTimeout: ClearTimeout;

// Extend the mocha test function with the skipIf that we patch in from index.ts
declare namespace Mocha {
    interface TestFunction {
        skipIf: (env: Environment | string[] | string, title: string, callback: Mocha.AsyncFunc | Mocha.Func) => void;
    }
}

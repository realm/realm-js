interface fs {
    exists: (path: string) => boolean;
}

interface path {
    dirname: (path: string) => string;
    resolve: (basePath: string, path?: string) => string;
}

type Require = (id: string) => any;

type Environment = { [key: string]: string };

interface Global extends NodeJS.Global {
    Realm: Realm;
    title: string;
    fs: fs;
    path: path;
    environment: Environment;
    require: Require;
}

declare var global: Global;
declare var fs: fs;
declare var path: path;
declare var require: Require;
declare var environment: Environment;

// Extend the mocha test function with the skipIf that we patch in from index.ts
declare namespace Mocha {
    interface TestFunction {
        skipIf: (env: Environment | string[] | string, title: string, callback: Mocha.AsyncFunc | Mocha.Func) => void;
    }
}

interface Console {
    error(message?: any, ...optionalParams: any[]): void;
    log(message?: any, ...optionalParams: any[]): void;
}

declare var console: Console;
// allow import of json files
declare module "*.json" {
  const value: any;
  export = value;
}

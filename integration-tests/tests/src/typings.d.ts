interface fs {
    exists: (path: string) => boolean;
}

interface path {
    dirname: (path: string) => string;
    resolve: (basePath: string, path?: string) => string;
}

type Require = (id: string) => any;

type Environment = { [key: string]: string };

declare class UndocumentedRealmClass extends Realm {
    static clearTestState(): void;
    _updateSchema(schema: any): void;
}

interface Global extends NodeJS.Global {
    UndocumentedRealm: typeof UndocumentedRealmClass;
    Realm: Realm;
    title: string;
    fs: fs;
    path: path;
    environment: Environment;
    require: Require;
}

declare var UndocumentedRealm: typeof UndocumentedRealmClass;
declare var global: Global;
declare var fs: fs;
declare var path: path;
declare var require: Require;
declare var environment: Environment;

// Extend the mocha test function with the skipIf that we patch in from index.ts
declare namespace Mocha {
    interface TestFunction {
        skipIf: (env: Environment) => void;
    }
}

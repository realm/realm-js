declare type PropertySuiteOptions = {
    type: string;
    objectTypes?: (undefined | string)[];
    defaults?: ({
        source: string;
    } | unknown)[];
    optionals?: boolean[];
};
export declare function describeProperty(title: string, { type, objectTypes, defaults, optionals }: PropertySuiteOptions): void;
export {};

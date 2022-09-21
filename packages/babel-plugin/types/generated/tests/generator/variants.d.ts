declare type SourceCode = {
    source: string;
};
export declare type PropertyTestOptions = {
    name: string;
    type: string;
    objectType: string | undefined;
    default: SourceCode | undefined | unknown;
    optional: boolean;
};
export declare type PropertyVariant = {
    name: string;
    type: undefined | string;
    typeArgument: undefined | string;
    initializer: undefined | string;
    questionMark: boolean;
};
export declare function generatePropertyVariants(options: PropertyTestOptions): PropertyVariant[];
export declare function generatePropertyCode({ name, questionMark, type, typeArgument, initializer }: PropertyVariant): string;
export {};

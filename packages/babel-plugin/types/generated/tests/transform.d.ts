import * as babel from "@babel/core";
export declare type TransformOptions = {
    source: string;
    extraPresets?: babel.PluginItem[];
    extraPlugins?: babel.PluginItem[];
    filename?: string;
};
export declare function transform({ source, extraPresets, extraPlugins, filename, }: TransformOptions): babel.BabelFileResult;

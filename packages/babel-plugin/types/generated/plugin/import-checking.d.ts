import { types, NodePath } from "@babel/core";
export declare function isImportedFromRealm(path: NodePath<types.Node>): boolean;
export declare function isPropertyImportedFromRealm(path: NodePath<types.Node>, name: string): boolean;

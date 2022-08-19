////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import { Results } from "./Results";

type PropertyType = string;
export type SortDescriptor = [string] | [string, boolean];
type CollectionChangeCallback<T> = unknown;

export class Collection<T = unknown> implements ReadonlyArray<T> {
  readonly [n: number]: T;

  get length(): number {
    throw new Error("Method not implemented.");
  }

  get type(): PropertyType {
    throw new Error("Method not implemented.");
  }
  get optional(): boolean {
    throw new Error("Method not implemented.");
  }

  keys(): IterableIterator<number> {
    throw new Error("Method not implemented.");
  }
  values(): IterableIterator<T> {
    throw new Error("Method not implemented.");
  }

  toString(): string {
    throw new Error("Method not implemented.");
  }
  toLocaleString(): string {
    throw new Error("Method not implemented.");
  }
  concat(...items: ConcatArray<T>[]): T[];
  concat(...items: (T | ConcatArray<T>)[]): T[];
  concat(...items: any[]): T[] {
    return [...this].concat(...items);
  }
  join(separator?: string): string {
    return [...this].join(separator);
  }
  slice(start?: number, end?: number): T[] {
    return [...this].slice(start, end);
  }
  indexOf(searchElement: T, fromIndex?: number): number {
    return [...this].indexOf(searchElement, fromIndex);
  }
  lastIndexOf(searchElement: T, fromIndex?: number): number {
    return [...this].lastIndexOf(searchElement, fromIndex);
  }
  every<S extends T>(
    predicate: (value: T, index: number, array: readonly T[]) => value is S,
    thisArg?: any,
  ): this is readonly S[];
  every(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean;
  every(predicate: any, thisArg?: any): boolean {
    return [...this].every(predicate, thisArg);
  }
  some(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean {
    return [...this].some(predicate, thisArg);
  }
  forEach(callbackfn: (value: T, index: number, array: readonly T[]) => void, thisArg?: any): void {
    return [...this].forEach(callbackfn, thisArg);
  }
  map<U>(callbackfn: (value: T, index: number, array: readonly T[]) => U, thisArg?: any): U[] {
    return [...this].map(callbackfn, thisArg);
  }
  filter<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: any): S[];
  filter(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): T[];
  filter<S extends T>(predicate: any, thisArg?: any): T[] | S[] {
    return [...this].filter(predicate, thisArg);
  }
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T): T;
  reduce(
    callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T,
    initialValue: T,
  ): T;
  reduce<U>(
    callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U,
    initialValue: U,
  ): U;
  reduce<U>(callbackfn: any, initialValue?: any): T | U {
    return [...this].reduce(callbackfn, initialValue);
  }
  reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T): T;
  reduceRight(
    callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T,
    initialValue: T,
  ): T;
  reduceRight<U>(
    callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U,
    initialValue: U,
  ): U;
  reduceRight<U>(callbackfn: any, initialValue?: any): T | U {
    return [...this].reduceRight(callbackfn, initialValue);
  }

  find<S extends T>(
    predicate: (this: void, value: T, index: number, obj: T[]) => value is S,
    thisArg?: any,
  ): S | undefined;
  find<T>(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
  find(predicate: (value: T, index: number, obj: T[]) => boolean, thisArg?: any): T | undefined {
    return [...this].find(predicate, thisArg);
  }
  findIndex(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: any): number {
    return [...this].findIndex(predicate, thisArg);
  }
  entries(): IterableIterator<[number, T]> {
    return [...this].entries();
  }
  includes(searchElement: T, fromIndex?: number): boolean {
    return [...this].includes(searchElement, fromIndex);
  }
  flatMap<U, This = undefined>(
    callback: (this: This, value: T, index: number, array: T[]) => U | readonly U[],
    thisArg?: This,
  ): U[] {
    return [...this].flatMap(callback, thisArg);
  }
  flat<A, D extends number = 1>(this: A, depth?: D): FlatArray<A, D>[];
  flat<D extends number = 1>(depth?: D): FlatArray<this, D>[] {
    throw new Error("Method not implemented.");
  }
  [Symbol.iterator](): IterableIterator<T> {
    return this.values();
  }

  // Other methods

  /**
   * @returns An object for JSON serialization.
   */
  toJSON(): Array<unknown> {
    throw new Error("Method not implemented.");
  }

  description(): string {
    throw new Error("Method not implemented.");
  }

  isValid(): boolean {
    throw new Error("Method not implemented.");
  }

  isEmpty(): boolean {
    throw new Error("Method not implemented.");
  }

  min(property?: string): number | Date | null {
    throw new Error("Method not implemented.");
  }
  max(property?: string): number | Date | null {
    throw new Error("Method not implemented.");
  }
  sum(property?: string): number | null {
    throw new Error("Method not implemented.");
  }
  avg(property?: string): number {
    throw new Error("Method not implemented.");
  }

  /**
   * @param  {string} query
   * @param  {any[]} ...arg
   * @returns Results
   */
  filtered(query: string, ...arg: any[]): Results<T> {
    throw new Error("Method not implemented.");
  }

  sorted(reverse?: boolean): Results<T>;
  sorted(descriptor: SortDescriptor[]): Results<T>;
  sorted(descriptor: string, reverse?: boolean): Results<T>;
  sorted(arg0?: boolean | SortDescriptor[] | string, arg1?: boolean): Results<T> {
    throw new Error("Method not implemented.");
  }

  /**
   * @returns Results
   */
  snapshot(): Results<T> {
    throw new Error("Method not implemented.");
  }

  /**
   * @param  {(collection:any,changes:any)=>void} callback
   * @returns void
   */
  addListener(callback: CollectionChangeCallback<T>): void {
    throw new Error("Method not implemented.");
  }

  /**
   * @returns void
   */
  removeAllListeners(): void {
    throw new Error("Method not implemented.");
  }

  /**
   * @param  {()=>void} callback this is the callback to remove
   * @returns void
   */
  removeListener(callback: CollectionChangeCallback<T>): void {
    throw new Error("Method not implemented.");
  }
}

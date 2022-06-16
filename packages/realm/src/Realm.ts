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

import binding from "@realm/bindgen";

import { Object as RealmObject } from "./Object";
import { Results } from "./Results";

export class Realm {
  public static Object = RealmObject;
  public static Results = Results;

  private internal: binding.Realm;

  constructor() {
    this.internal = binding.Realm.getSharedRealm({
      path: this.getDefaultPath(),
      fifoFilesFallbackPath: this.fifoFilesFallbackPath(),
    });
  }

  get empty(): boolean {
    throw new Error("Not yet implemented");
  }

  get path(): string {
    throw new Error("Not yet implemented");
  }

  get readOnly(): boolean {
    throw new Error("Not yet implemented");
  }

  get schema(): any {
    throw new Error("Not yet implemented");
  }

  get schemaVersion(): number {
    throw new Error("Not yet implemented");
  }

  get isInTransaction(): boolean {
    throw new Error("Not yet implemented");
  }

  get isClosed(): boolean {
    throw new Error("Not yet implemented");
  }

  get syncSession(): any {
    throw new Error("Not yet implemented");
  }

  get subscriptions(): any {
    throw new Error("Not yet implemented");
  }

  close(): void {
    throw new Error("Not yet implemented");
  }

  create(): RealmObject {
    throw new Error("Not yet implemented");
  }

  delete(): void {
    throw new Error("Not yet implemented");
  }

  deleteModel(): void {
    throw new Error("Not yet implemented");
  }

  deleteAll(): void {
    throw new Error("Not yet implemented");
  }

  objectForPrimaryKey(): RealmObject {
    throw new Error("Not yet implemented");
  }

  objects<T>(): Results<T> {
    throw new Error("Not yet implemented");
  }

  addListener(): unknown {
    throw new Error("Not yet implemented");
  }

  removeListener(): unknown {
    throw new Error("Not yet implemented");
  }

  removeAllListeners(): unknown {
    throw new Error("Not yet implemented");
  }

  write<T>(callback: () => T): T {
    throw new Error("Not yet implemented");
  }

  beginTransaction(): unknown {
    throw new Error("Not yet implemented");
  }

  commitTransaction(): unknown {
    throw new Error("Not yet implemented");
  }

  cancelTransaction(): unknown {
    throw new Error("Not yet implemented");
  }

  compact(): boolean {
    throw new Error("Not yet implemented");
  }

  writeCopyTo(): unknown {
    throw new Error("Not yet implemented");
  }

  _updateSchema(): unknown {
    throw new Error("Not yet implemented");
  }

  /**
   * TODO: Make this platform dependent
   */
  private getDefaultPath() {
    return "default.realm";
  }

  /**
   * TODO: Make this platform dependent
   */
  private fifoFilesFallbackPath() {
    return "";
  }
}

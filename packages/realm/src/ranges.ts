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

type IndexSet = [number, number];

export function unwind(ranges: IndexSet[] | Iterable<IndexSet>): number[] {
  if (Array.isArray(ranges)) {
    return ranges.flatMap(([start, end]) => new Array(end - start).fill(0).map((_, index) => start + index));
  } else {
    return unwind([...ranges]);
  }
}

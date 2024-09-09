////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import React, { Profiler, useRef, PropsWithChildren } from "react";

export type RenderConstraintProps = PropsWithChildren<{
  updateLimit: number;
}>;

export function RenderConstraint({ updateLimit, children }: RenderConstraintProps) {
  const idRef = useRef("render-constraint-" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
  const updatesRef = useRef(0);
  return (
    <Profiler
      id={idRef.current}
      children={children}
      onRender={(id, phase) => {
        if (phase !== "mount") {
          updatesRef.current++;
        }
        if (updatesRef.current > updateLimit) {
          throw new Error(`Constraint violated ('${idRef.current}' rendered ${updatesRef.current} of ${updateLimit})`);
        }
      }}
    />
  );
}

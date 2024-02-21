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

import React, { Profiler, ProfilerOnRenderCallback } from "react";
import { renderHook, RenderHookResult, RenderHookOptions } from "@testing-library/react-native";

function generateProfilerId() {
  const nonce = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return `test-${nonce}`;
}

type RenderEvent = {
  phase: "mount" | "update";
  actualDuration: number;
  baseDuration: number;
};

type ProfileWrapper = {
  wrapper: React.ComponentType<React.PropsWithChildren>;
  renders: RenderEvent[];
};

function createProfilerWrapper(Parent: undefined | React.ComponentType<React.PropsWithChildren>): ProfileWrapper {
  const renders: RenderEvent[] = [];
  const id = generateProfilerId();
  const handleRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    interactions,
  ) => {
    renders.push({ phase, actualDuration, baseDuration });
  };

  const Wrapper: React.ComponentType<React.PropsWithChildren> = ({ children }) => (
    <Profiler id={id} onRender={handleRender} children={children} />
  );

  return {
    wrapper: Parent
      ? ({ children }) => (
          <Parent>
            <Wrapper children={children} />
          </Parent>
        )
      : Wrapper,
    renders,
  };
}

export function profileHook<Result, Props>(
  callback: (props: Props) => Result,
  options?: RenderHookOptions<Props>,
): RenderHookResult<Result, Props> & { renders: RenderEvent[] } {
  const { wrapper, renders } = createProfilerWrapper(options?.wrapper);
  const result = renderHook<Result, Props>(callback, { ...options, wrapper });
  return { ...result, renders };
}

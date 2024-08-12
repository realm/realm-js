////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import React, { PropsWithChildren } from "react";
import {
  EstimateProgressNotificationCallback,
  ProgressDirection,
  ProgressMode,
  ProgressNotificationCallback,
} from "realm";
import { render } from "@testing-library/react-native";

import { callMockedProgressNotifications, mockSyncedRealm } from "./mocks";
import { RealmProvider, useProgress } from "..";
import { sleep } from "./helpers";
import { Text } from "react-native";

const expectedProgress = {
  [ProgressMode.ForCurrentlyOutstandingWork]: {
    [ProgressDirection.Download]: [1, 0.2, 0.6, 1],
    [ProgressDirection.Upload]: [1, 0.3, 0.7, 1],
  },
  [ProgressMode.ReportIndefinitely]: {
    [ProgressDirection.Download]: [0, 0.25, 0.65, 1],
    [ProgressDirection.Upload]: [0, 0.35, 0.75, 1],
  },
};

const progressTestDuration = 100;

const mockSyncedRealmWithProgress = () => {
  const progressNotifiers: Map<ProgressNotificationCallback, NodeJS.Timeout> = new Map();
  return mockSyncedRealm({
    syncSession: {
      addProgressNotification(direction, mode, callback) {
        progressNotifiers.set(
          callback,
          callMockedProgressNotifications(
            callback as EstimateProgressNotificationCallback,
            // Make download progress "quicker" to compare different testing cases.
            direction == ProgressDirection.Download ? progressTestDuration - 10 : progressTestDuration,
            expectedProgress[mode][direction],
          ),
        );
      },
      removeProgressNotification: (callback) => {
        clearInterval(progressNotifiers.get(callback));
        progressNotifiers.delete(callback);
      },
    },
  });
};

describe("useProgress", () => {
  describe("all methods are callable and report a state", () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    (
      [
        [ProgressMode.ReportIndefinitely, ProgressDirection.Download],
        [ProgressMode.ReportIndefinitely, ProgressDirection.Upload],
        [ProgressMode.ForCurrentlyOutstandingWork, ProgressDirection.Download],
        [ProgressMode.ForCurrentlyOutstandingWork, ProgressDirection.Upload],
      ] as [ProgressMode, ProgressDirection][]
    ).forEach(([mode, direction]) => {
      it(`should provide correct progress with ${mode} and ${direction}`, async () => {
        const realm = mockSyncedRealmWithProgress();

        const renderedProgressValues: (number | null)[] = [];

        const RealmProviderWrapper = ({ children }: PropsWithChildren) => {
          return <RealmProvider realm={realm}>{children}</RealmProvider>;
        };

        const ProgressText: React.FC = () => {
          const progress = useProgress({
            direction,
            mode,
          });
          renderedProgressValues.push(progress);
          return progress;
        };
        render(<ProgressText />, { wrapper: RealmProviderWrapper });

        await sleep(progressTestDuration);

        expect(renderedProgressValues).toStrictEqual([null, ...expectedProgress[mode][direction]]);
      });
    });

    it("should handle multiple useProgress hooks with different options", async () => {
      const realm = mockSyncedRealmWithProgress();

      const renderedProgressValues: [number | null, number | null][] = [];

      const RealmProviderWrapper = ({ children }: PropsWithChildren) => {
        return <RealmProvider realm={realm}>{children}</RealmProvider>;
      };

      const ProgressText: React.FC = () => {
        const progressA = useProgress({
          direction: ProgressDirection.Download,
          mode: ProgressMode.ForCurrentlyOutstandingWork,
        });
        const progressB = useProgress({
          direction: ProgressDirection.Upload,
          mode: ProgressMode.ReportIndefinitely,
        });

        renderedProgressValues.push([progressA, progressB]);
        return (
          <Text>
            {progressA} | {progressB}
          </Text>
        );
      };
      render(<ProgressText />, { wrapper: RealmProviderWrapper });

      await sleep(progressTestDuration);

      const expectedA = expectedProgress[ProgressMode.ForCurrentlyOutstandingWork][ProgressDirection.Download];
      const expectedB = expectedProgress[ProgressMode.ReportIndefinitely][ProgressDirection.Upload];
      const expectedValues = [
        [null, null],
        // They will both have a callback right away on first render, afterwards it'll be an interval where
        // progressA is always a couple milliseconds quicker.
        [expectedA[0], expectedB[0]],
        [expectedA[1], expectedB[0]],
        [expectedA[1], expectedB[1]],
        [expectedA[2], expectedB[1]],
        [expectedA[2], expectedB[2]],
        [expectedA[3], expectedB[2]],
        [expectedA[3], expectedB[3]],
      ];

      expect(renderedProgressValues).toStrictEqual(expectedValues);
    });
  });
});

import React, { useEffect, useState, createContext, useContext } from "react";

import { Client, CustomContext } from "mocha-remote-client";

export type { CustomContext };

export type Status =
  | {
    kind: "waiting";
  }
  | {
    kind: "running";
    failures: number;
    totalTests: number;
    currentTest: string;
    currentTestIndex: number;
  }
  | {
    kind: "ended";
    failures: number;
    totalTests: number;
  }

export type MochaRemoteProviderProps = React.PropsWithChildren<{
  title?: string;
  tests: (context: CustomContext) => void;
}>;

export type MochaRemoteContextValue = {
  connected: boolean;
  status: Status;
  context: CustomContext;
};

export const MochaRemoteContext = createContext<MochaRemoteContextValue>({
  connected: false,
  status: { kind: "waiting" },
  context: {},
});

export function MochaRemoteProvider({ children, tests, title = `Browser on ${window.navigator.userAgent}` }: MochaRemoteProviderProps) {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "waiting" });
  const [context, setContext] = useState<CustomContext>({});
  useEffect(() => {
    const client = new Client({
      title,
      tests(context) {
        // Adding an async hook before each test to allow the UI to update
        beforeEach("async-pause", () => {
          return new Promise<void>((resolve) => setTimeout(resolve));
        });
        // Require in the tests
        tests(context);
        // Make the context available to context consumers
        setContext(context);
      },
    })
      .on("connection", () => {
        setConnected(true);
      })
      .on("disconnection", () => {
        setConnected(false);
      })
      .on("running", (runner) => {
        // TODO: Fix the types for "runner"
        if (runner.total === 0) {
          setStatus({
            kind: "ended",
            totalTests: 0,
            failures: 0,
          });
        }

        let currentTestIndex = 0;

        runner.on("test", (test) => {
          setStatus({
            kind: "running",
            currentTest: test.fullTitle(),
            // Compute the current test index - incrementing it if we're running
            currentTestIndex: currentTestIndex++,
            totalTests: runner.total,
            failures: runner.failures,
          });
        }).on("end", () => {
          setStatus({
            kind: "ended",
            totalTests: runner.total,
            failures: runner.failures,
          });
        });
      });

    return () => {
      client.disconnect();
    };
  }, [setStatus, setContext]);

  return (
    <MochaRemoteContext.Provider value={{ status, connected, context }}>
      {children}
    </MochaRemoteContext.Provider>
  );
}

export function useMochaRemoteContext() {
  return useContext(MochaRemoteContext);
}

function getStatusEmoji(status: Status) {
  if (status.kind === "running") {
    return "🏃";
  } else if (status.kind === "waiting") {
    return "⏳";
  } else if (status.kind === "ended" && status.totalTests === 0) {
    return "🤷";
  } else if (status.kind === "ended" && status.failures > 0) {
    return "❌";
  } else if (status.kind === "ended") {
    return "✅";
  } else {
    return null;
  }
}

export function StatusEmoji(props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>) {
  const { status } = useMochaRemoteContext();
  return <span {...props}>{getStatusEmoji(status)}</span>
}

function getStatusMessage(status: Status) {
  if (status.kind === "running") {
    return `[${status.currentTestIndex + 1} of ${status.totalTests}] ${status.currentTest}`;
  } else if (status.kind === "waiting") {
    return "Waiting for server to start tests";
  } else if (status.kind === "ended" && status.failures > 0) {
    return `${status.failures} tests failed!`;
  } else if (status.kind === "ended") {
    return "All tests succeeded!";
  } else {
    return null;
  }
}

export function StatusText(props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>) {
  const { status } = useMochaRemoteContext();
  return <span {...props}>{getStatusMessage(status)}</span>
}

function getConnectionMessage(connected: boolean) {
  if (connected) {
    return "🛜 Connected to the Mocha Remote Server";
  } else {
    return "🔌 Disconnected from the Mocha Remote Server";
  }
}

export function ConnectionText(props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>) {
  const { connected } = useMochaRemoteContext();
  return <span {...props}>{getConnectionMessage(connected)}</span>
}

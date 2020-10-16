////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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
import cp from "child_process";

import { run } from "./index";

const IMAGE_TAG = process.env.MONGODB_REALM_TEST_SERVER || "latest";

async function startServer() {
    console.log("Starting MongoDB Realm server");
    const serverProcess = cp.spawn(
        "docker",
        [
            "run",
            "--rm",
            "--name",
            "mongodb-realm-test-server",
            "--publish=9090:9090",
            `docker.pkg.github.com/realm/ci/mongodb-realm-test-server:${IMAGE_TAG}`,
        ],
        { stdio: ["ignore", "pipe", "inherit"] },
    );
    // Kill the server when the process ends
    function killServer() {
        console.log("Killing the MongoDB Realm server");
        // Tell docker to kill the container
        cp.execSync("docker kill mongodb-realm-test-server", {
            encoding: "utf8",
        });
    }
    process.once("exit", killServer);
    process.on("SIGINT", () => {
        // Stop listening on the exit event
        process.off("exit", killServer);
        // Kill the server
        killServer();
        // Exit
        process.exit(1);
    });
    // Start reading the STDOUT to determine when the container is ready for connections
    return new Promise((resolve, reject) => {
        let output = "";
        /**
         * Handle standard output by looking for a started "Stitch" service.
         */
        function handleOutput(chunk: Buffer) {
            // Write to the regular STDOUT
            process.stdout.write(chunk);
            // Resolve the promise when the server gets ready
            output += chunk.toString();
            // If it contains the magic string
            if (output.includes("Starting Stitch... Done")) {
                // Stop listening for output
                serverProcess.stdout.off("data", handleOutput);
                resolve();
            }
        }
        /**
         * Handle an unexpected exit by rejecting the promise
         */
        function handleUnexpectedExit() {
            const err = new Error(
                "MongoDB Realm server closed before it was ready",
            );
            reject(err);
        }
        // Start listening for output
        serverProcess.stdout.on("data", handleOutput);
        // Reject the promise if the process exits before it gets ready
        serverProcess.once("exit", handleUnexpectedExit);
    });
}

async function startRunAndStop() {
    await startServer();
    await run();
}

startRunAndStop().then(
    () => {
        process.exit();
    },
    err => {
        console.error(err);
        process.exit(1);
    },
);

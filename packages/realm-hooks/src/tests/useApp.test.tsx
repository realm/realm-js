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

import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { expect } from "chai";

import { useApp } from "../useApp";

/* eslint-disable jsdoc/require-jsdoc */

afterEach(cleanup);

describe("useApp hook", () => {
    it("can render", () => {
        function App() {
            const app = useApp("test-app-id");
            return <>app-id = {app.id}</>;
        }
        render(<App />);
        const p = screen.getByText(/app-id = [\w]/);
        expect(p.innerHTML).equals("app-id = test-app-id");
    });
});

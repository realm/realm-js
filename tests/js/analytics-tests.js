////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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


const require_method = require;
function node_require(module) {
    return require_method(module);
}

module.exports = {
    async testAnalyticsSubmission() {
        const context = node_require('realm/package.json');
        const analytics = node_require('realm/lib/submit-analytics');

        const payload = await analytics.fetchPlatformData(context, 'TestEvent');

        TestCase.assertDefined(payload.webHook);
        TestCase.assertType(payload.webHook.event, 'string');
        TestCase.assertDefined(payload.webHook.properties);
        TestCase.assertType(payload.webHook.properties.Binding, 'string');
        TestCase.assertDefined(payload.mixPanel);
        TestCase.assertType(payload.mixPanel.event, 'string');
        TestCase.assertDefined(payload.mixPanel.properties);
        TestCase.assertType(payload.mixPanel.properties.Binding, 'string');

        await analytics.submitStageAnalytics('TestEvent');
    }
};
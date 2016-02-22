////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

'use strict';

import React from 'react-native';

const rootComponentPromise = new Promise((resolve) => {
    // Require internal module here so the promise is rejected if there is an error.
    let Mount = require('react-native/Libraries/ReactNative/ReactNativeMount');
    let renderComponent = Mount.renderComponent;

    Mount.renderComponent = function() {
        let component = renderComponent.apply(this, arguments);

        resolve(component);
        return component;
    };
});

export function getRootComponent() {
    return rootComponentPromise;
}

export function assertChildExists(component, name) {
    if (!findChildComponent(component, name)) {
        throw new Error(name + ' not rendered');
    }
}

export function findChildComponent(component, name) {
    for (let child of traverseChildren(component)) {
        if (child.type.name == name) {
            return child;
        }
    }
    return null;
}

export function* traverseChildren(component) {
    let props = component.props;

    // The hacky TopLevelWrapper has its props set to the root element.
    if (props.props) {
        props = props.props;
    }

    let children = props.children;
    if (!children) {
        return;
    }

    // ReactNative is missing React.Children.toArray()
    for (let child of React.Children.map(children, (x) => x)) {
        yield child;
        yield* traverseChildren(child);
    }
}

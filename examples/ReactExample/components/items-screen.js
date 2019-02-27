////////////////////////////////////////////////////////////////////////////
//
// Copyright 2017 Realm Inc.
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

import React from 'react';

import {
    Platform,
    StatusBar,
} from 'react-native';
import TodoItemsView from './todo-itemsview';

export default class ItemsScreen extends React.Component {
    static navigationOptions = {
        title: 'Current list',
    };

    constructor(props) {
        super(props);
        this.state = {};
    }

    componentWillMount() {
        if (Platform.OS == 'ios') {
            StatusBar.setBarStyle('light-content');
        }
    }

    render() {
        let properties = {};
        return <TodoItemsView items={this.props.navigation.state.params.items} {...properties} />;
    }
}

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

import React from 'react';

import {
    Platform,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import TodoItem from './todo-item';
import TodoListView from './todo-listview';
import TodoItemsView from './todo-itemsview';
import TodoListItem from './todo-list-item';
import realm from './realm';
import styles from './styles';

import { StackNavigator } from 'react-navigation';

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
        // let objects = realm.objects('Todo');
        // let extraItems = [
        //     { name: 'Complete', items: objects.filtered('done = true') },
        //     { name: 'Incomplete', items: objects.filtered('done = false') },
        // ];

        let properties = {
            // ref: 'listView',
            // extraItems: extraItems,
            // onPressItem: this._onPressTodoList,
        }

        return <TodoItemsView items={this.props.navigation.state.params.items} {...properties} />;
    }

    // renderScene(route) {
    //     console.log(this.todoLists);
    //     return <route.component items={this.todoLists} {...route.passProps} />
    // }

    

    // _onPressTodoItem(list) {
    //     const { navigate } = this.props.navigation;
    //     let items = list.items;

    //     let route = {
    //         title: list.name,
    //         component: TodoListView,
    //         passProps: {
    //             ref: 'listItemView',
    //             items: items,
    //             rowClass: TodoItem,
    //         },
    //     };

    //     // Check if the items are mutable (i.e. List rather than Results).
    //     if (items.push) {
    //         Object.assign(route, {
    //             rightButtonTitle: 'Add',
    //             onRightButtonPress: () => this._addNewTodoItem(list),
    //         });
    //     }

    //     // this.refs.nav.push(route);
    //     navigate('TodoListItem', { items: items })
    // }
}
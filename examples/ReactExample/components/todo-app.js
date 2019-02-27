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
} from 'react-native';

import TodoListView from './todo-listview';
import ItemsScreen from './items-screen'
import realm from './realm';

import { StackNavigator } from 'react-navigation';

class HomeScreen extends React.Component {
    static navigationOptions = {
        title: 'My Todo Lists',
    };

    constructor(props) {
        super(props);

        // This is a Results object, which will live-update.
        this.todoLists = realm.objects('TodoList').sorted('creationDate');
        if (this.todoLists.length < 1) {
            realm.write(() => {
                realm.create('TodoList', { name: 'Todo List', creationDate: new Date() });
            });
        }
        this.todoLists.addListener((name, changes) => {
            console.log("changed: " + JSON.stringify(changes));
        });
        console.log("registered listener");


        // Bind all the methods that we will be passing as props.
        this._addNewTodoList = this._addNewTodoList.bind(this);
        this._onPressTodoList = this._onPressTodoList.bind(this);

        this.state = {};
    }

    get currentListView() {
        let refs = this.refs.nav.refs;
        return refs.listItemView || refs.listView;
    }

    componentWillMount() {
        if (Platform.OS == 'ios') {
            StatusBar.setBarStyle('light-content');
        }
    }

    render() {
        let objects = realm.objects('Todo');
        let extraItems = [
            { name: 'Complete', items: objects.filtered('done = true') },
            { name: 'Incomplete', items: objects.filtered('done = false') },
        ];

        let properties = {
            ref: 'listView',
            extraItems: extraItems,
            onPressItem: this._onPressTodoList,
        }

        return <TodoListView items={this.todoLists} {...properties} />;
    }

    renderScene(route) {
        console.log(this.todoLists);
        return <route.component items={this.todoLists} {...route.passProps} />
    }

    _addNewTodoItem(list) {
        let items = list.items;
        if (!this._shouldAddNewItem(items)) {
            return;
        }

        realm.write(() => {
            items.push({ text: '' });
        });

        this._setEditingRow(items.length - 1);
    }

    _addNewTodoList() {
        let items = this.todoLists;
        if (!this._shouldAddNewItem(items)) {
            return;
        }

        realm.write(() => {
            realm.create('TodoList', { name: '', creationDate: new Date() });
        });

        this._setEditingRow(items.length - 1);
    }

    _onPressTodoList(list) {
        const { navigate } = this.props.navigation;
        let items = list.items;

        navigate('ItemsScreen', { items: items })
    }

    _shouldAddNewItem(items) {
        let editingRow = this.currentListView.state.editingRow;
        let editingItem = editingRow != null && items[editingRow];

        // Don't allow adding a new item if the one being edited is empty.
        return !editingItem || !!editingItem.text || !!editingItem.name;
    }

    _setEditingRow(rowIndex) {
        let listView = this.currentListView;

        // Update the state on the currently displayed TodoList to edit this new item.
        listView.setState({ editingRow: rowIndex });
        listView.updateDataSource();
    }
}

const SimpleApp = StackNavigator({
    Home: { screen: HomeScreen },
    ItemsScreen: { screen: ItemsScreen }
});

export default SimpleApp;

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
    Navigator,
    Platform,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import TodoItem from './todo-item';
import TodoListView from './todo-listview';
import realm from './realm';
import styles from './styles';

export default class TodoApp extends React.Component {
    constructor(props) {
        super(props);

        // This is a Results object, which will live-update.
        this.todoLists = realm.objects('TodoList').sorted('creationDate');
        if (this.todoLists.length < 1) {
            realm.write(() => {
                realm.create('TodoList', {name: 'Todo List', creationDate: new Date()});
            });
        }
        this.todoLists.addListener((name, changes) => {
            console.log("changed: " + JSON.stringify(changes));
        });
        console.log("registered listener");


        // Bind all the methods that we will be passing as props.
        this.renderScene = this.renderScene.bind(this);
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
            {name: 'Complete', items: objects.filtered('done = true')},
            {name: 'Incomplete', items: objects.filtered('done = false')},
        ];

        let route = {
            title: 'My Todo Lists',
            component: TodoListView,
            passProps: {
                ref: 'listView',
                extraItems: extraItems,
                onPressItem: this._onPressTodoList,
            },
            backButtonTitle: 'Lists',
            rightButtonTitle: 'Add',
            onRightButtonPress: this._addNewTodoList,
        };

        let navigationBar = (
            <Navigator.NavigationBar routeMapper={RouteMapper} style={styles.navBar} />
        );

        return (
            <Navigator
                ref="nav"
                initialRoute={route}
                navigationBar={navigationBar}
                renderScene={this.renderScene}
                sceneStyle={styles.navScene}
                style={styles.navigator}
            />
        );
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
            items.push({text: ''});
        });

        this._setEditingRow(items.length - 1);
    }

    _addNewTodoList() {
        let items = this.todoLists;
        if (!this._shouldAddNewItem(items)) {
            return;
        }

        realm.write(() => {
            realm.create('TodoList', {name: '', creationDate: new Date()});
        });

        this._setEditingRow(items.length - 1);
    }

    _onPressTodoList(list) {
        let items = list.items;

        let route = {
            title: list.name,
            component: TodoListView,
            passProps: {
                ref: 'listItemView',
                items: items,
                rowClass: TodoItem,
            },
        };

        // Check if the items are mutable (i.e. List rather than Results).
        if (items.push) {
            Object.assign(route, {
                rightButtonTitle: 'Add',
                onRightButtonPress: () => this._addNewTodoItem(list),
            });
        }

        this.refs.nav.push(route);
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
        listView.setState({editingRow: rowIndex});
        listView.updateDataSource();
    }
}

const RouteMapper = {
    LeftButton(route, navigator, index, navState) {
        if (index == 0) {
            return null;
        }

        let prevRoute = navState.routeStack[index - 1];
        return (
            <TouchableOpacity onPress={() => navigator.pop()}>
                <View style={[styles.navBarView, styles.navBarLeftButton]}>
                    <Text style={styles.navBarLeftArrow}>‹</Text>
                    <Text style={styles.navBarText}>
                        {prevRoute.backButtonTitle || prevRoute.title || 'Back'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    },

    RightButton(route) {
        if (!route.rightButtonTitle) {
            return null;
        }

        return (
            <TouchableOpacity onPress={route.onRightButtonPress}>
                <View style={[styles.navBarView, styles.navBarRightButton]}>
                    <Text style={styles.navBarText}>
                        {route.rightButtonTitle}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    },

    Title(route) {
        return (
            <View style={styles.navBarView}>
                <Text style={[styles.navBarText, styles.navBarTitleText]}>
                    {route.title}
                </Text>
            </View>
        );
    },
};

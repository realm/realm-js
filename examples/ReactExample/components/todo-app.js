/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

const React = require('react-native');
const TodoItem = require('./todo-item');
const TodoListView = require('./todo-listview');
const realm = require('./realm');
const styles = require('./styles');

const { Navigator } = React;

class TodoApp extends React.Component {
    constructor(props) {
        super(props);

        let todoLists = realm.objects('TodoList');
        if (todoLists.length < 1) {
            realm.write(() => {
                realm.create('TodoList', {name: 'Todo List', items: []});
            });
        }

        // This is a Results object, which will live-update.
        this.todoLists = todoLists;
        this.state = {};
    }

    get currentListView() {
        let refs = this.refs.nav.refs;
        return refs.listItemView || refs.listView;
    }

    render() {
        let extraItems = [
            {name: 'Complete', items: realm.objects('Todo', 'done = true')},
            {name: 'Incomplete', items: realm.objects('Todo', 'done = false')},
        ];

        let route = {
            name: 'My Todo Lists',
            index: 0,
            component: TodoListView,
            passProps: {
                ref: 'listView',
                items: this.todoLists,
                extraItems: extraItems,
                onPressItem: (list) => this._onPressTodoList(list),
            },
            backButtonTitle: 'Lists',
            rightButtonTitle: 'Add',
            onRightButtonPress: () => this._addNewTodoList(),
        };

        return (
            <Navigator ref="nav" initialRoute={route} style={styles.navigator} />
        );
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
            realm.create('TodoList', {name: '', items: []});
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
        // Update the state on the currently displayed TodoList to edit this new item.
        this.currentListView.setState({editingRow: rowIndex});
    }
}

module.exports = TodoApp;

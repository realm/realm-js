/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

const React = require('react-native');
const TodoItem = require('./todo-item');
const TodoListView = require('./todo-listview');
const realm = require('./realm');
const styles = require('./styles');

const {
    Navigator,
    Text,
    TouchableOpacity,
} = React;

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

    render() {
        let extraItems = [
            {name: 'Complete', items: realm.objects('Todo', 'done = true')},
            {name: 'Incomplete', items: realm.objects('Todo', 'done = false')},
        ];

        let route = {
            title: 'My Todo Lists',
            component: TodoListView,
            passProps: {
                ref: 'listView',
                items: this.todoLists,
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
        return <route.component {...route.passProps} />
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

const RouteMapper = {
    LeftButton(route, navigator, index, navState) {
        if (index == 0) {
            return null;
        }

        let prevRoute = navState.routeStack[index - 1];
        return (
            <TouchableOpacity
                onPress={() => navigator.pop()}
                style={styles.navBarLeftButton}>
                <Text style={styles.navBarText}>
                    <Text style={styles.navBarLeftArrow}>‹</Text>
                    {prevRoute.backButtonTitle || prevRoute.title || 'Back'}
                </Text>
            </TouchableOpacity>
        );
    },

    RightButton(route) {
        if (!route.rightButtonTitle) {
            return null;
        }

        return (
            <TouchableOpacity
                onPress={route.onRightButtonPress}
                style={styles.navBarRightButton}>
                <Text style={styles.navBarText}>
                    {route.rightButtonTitle}
                </Text>
            </TouchableOpacity>
        );
    },

    Title(route) {
        return (
            <Text style={[styles.navBarText, styles.navBarTitle]}>
                {route.title}
            </Text>
        );
    },
};

module.exports = TodoApp;

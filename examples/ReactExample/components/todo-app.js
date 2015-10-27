'use strict';

const React = require('react-native');
const TodoItem = require('./todo-item');
const TodoListView = require('./todo-listview');
const realm = require('./realm');
const styles = require('./styles');

const { NavigatorIOS } = React;

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
            title: 'My Todo Lists',
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
            <NavigatorIOS ref="nav" initialRoute={route} style={styles.navigator} />
        );
    }

    _addNewTodoItem(list) {
        realm.write(() => {
            list.items.push({text: ''});
        });

        this._setEditingRow(list.items.length - 1);
    }

    _addNewTodoList() {
        realm.write(() => {
            realm.create('TodoList', {name: '', items: []});
        });

        this._setEditingRow(this.todoLists.length - 1);
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

    _setEditingRow(rowIndex) {
        // Update the state on the currently displayed TodoList to edit this new item.
        this.currentListView.setState({editingRow: rowIndex});
    }
}

module.exports = TodoApp;

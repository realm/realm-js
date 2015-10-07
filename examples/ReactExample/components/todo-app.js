'use strict';

const React = require('react-native');
const TodoList = require('./todo-list');
const realm = require('./realm');

const { NavigatorIOS } = React;

class TodoApp extends React.Component {
    componentWillMount() {
        let todoLists = realm.objects('TodoList');

        if (todoLists.length < 1) {
            realm.write(() => {
                realm.create('TodoList', {name: 'Todo List', items: []});
            });
        }

        this.todoLists = todoLists;
    }

    render() {
        let list = this.todoLists[0];

        let route = {
            title: list.name,
            component: TodoList,
            passProps: {
                ref: 'todoList',
                list: list,
            },
            rightButtonTitle: 'Add',
            onRightButtonPress: () => this._addNewItem(list)
        };

        return (
            <NavigatorIOS ref="nav" initialRoute={route} style={{flex: 1}} />
        );
    }

    _addNewItem(list) {
        realm.write(() => {
            list.items.push({text: ''});
        });

        let todoList = this.refs.nav.refs.todoList;
        todoList.setState({editingRow: list.items.length - 1});
    }
}

module.exports = TodoApp;

'use strict';

const React = require('react-native');
const TodoItem = require('./todo-item');
const realm = require('./realm');
const styles = require('./styles');

const { ListView, Text, View } = React;

class TodoList extends React.Component {
    constructor(props) {
        super(props);

        this.dataSource = new ListView.DataSource({
            rowHasChanged: (row1, row2) => row1 !== row2
        });

        this.state = {};
        this._renderRow = this._renderRow.bind(this);
    }

    render() {
        let dataSource = this.dataSource.cloneWithRows(this.props.list.items);

        return (
            <View style={styles.container}>
                <ListView style={styles.listView} dataSource={dataSource} renderRow={this._renderRow} />
                <Text style={styles.instructions}>
                    Press Cmd+R to reload,{'\n'}
                    Cmd+D for dev menu
                </Text>
            </View>
        );
    }

    _renderRow(item, sectionIndex, rowIndex) {
        return (
            <TodoItem
                item={item}
                editing={this.state.editingRow == rowIndex}
                onPress={() => this._onPressRow(rowIndex)}
                onPressDelete={() => this._onPressDeleteRow(rowIndex)}
                onEndEditing={() => this._onEndEditingRow(rowIndex)} />
        );
    }

    _onPressRow(rowIndex) {
        let editingRow = this.state.editingRow;

        if (editingRow != null && editingRow != rowIndex) {
            this._onEndEditingRow(editingRow);
        }

        this.setState({editingRow: rowIndex});
    }

    _onPressDeleteRow(rowIndex) {
        let items = this.props.list.items;

        realm.write(() => items.splice(rowIndex, 1));

        this.forceUpdate();
    }

    _onEndEditingRow(rowIndex) {
        let items = this.props.list.items;

        // Delete the todo item if it doesn't have any text.
        if (!items[rowIndex].text) {
            realm.write(() => items.splice(rowIndex, 1));
        }

        if (this.state.editingRow == rowIndex) {
            this.setState({editingRow: null});
        }
    }
}

module.exports = TodoList;

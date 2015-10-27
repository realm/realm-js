'use strict';

const React = require('react-native');
const TodoListItem = require('./todo-list-item');
const realm = require('./realm');
const styles = require('./styles');

const { ListView, Text, View } = React;

class TodoListView extends React.Component {
    constructor(props) {
        super(props);

        this.dataSource = new ListView.DataSource({
            rowHasChanged: (row1, row2) => row1 !== row2
        });

        this.state = {};
        this.renderRow = this.renderRow.bind(this);
    }

    componentWillUpdate(nextProps, nextState) {
        let editingRow = this.state.editingRow;

        if (editingRow != null && editingRow != nextState.editingRow) {
            let item = this.props.items[editingRow];

            // The item may have already been deleted.
            if (item) {
                this._deleteItemIfEmpty(item);
            }
        }
    }

    render() {
        // Clone the items into a new Array to prevent unexpected errors from changes in length.
        let items = Array.from(this.props.items);
        let dataSource = this.dataSource.cloneWithRows(items);

        return (
            <View style={styles.container}>
                <ListView style={styles.listView} dataSource={dataSource} renderRow={this.renderRow} />
                <Text style={styles.instructions}>
                    Press Cmd+R to reload,{'\n'}
                    Cmd+D for dev menu
                </Text>
            </View>
        );
    }

    renderRow(item, sectionIndex, rowIndex) {
        let RowClass = this.props.rowClass || TodoListItem;

        return (
            <RowClass
                item={item}
                editing={this.state.editingRow == rowIndex}
                onPress={() => this._onPressRow(item, rowIndex)}
                onPressDelete={() => this._onPressDeleteRow(item, rowIndex)}
                onEndEditing={() => this._onEndEditingRow(item, rowIndex)} />
        );
    }

    _onPressRow(item, rowIndex) {
        let onPressItem = this.props.onPressItem;
        if (onPressItem) {
            onPressItem(item, rowIndex);
            return;
        }

        // If no handler was provided, then default to editing the row.
        this.setState({editingRow: rowIndex});
    }

    _onPressDeleteRow(item) {
        realm.write(() => realm.delete(item));

        this.forceUpdate();
    }

    _onEndEditingRow(item, rowIndex) {
        this._deleteItemIfEmpty(item);

        if (this.state.editingRow == rowIndex) {
            this.setState({editingRow: null});
        }
    }

    _deleteItemIfEmpty(item) {
        // The item could be a TodoList or a Todo.
        if (!item.name && !item.text) {
            realm.write(() => realm.delete(item));
        }
    }
}

module.exports = TodoListView;

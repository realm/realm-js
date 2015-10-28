/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

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
            sectionHeaderHasChanged: () => false,
            rowHasChanged: (row1, row2) => row1 !== row2
        });

        this.state = {};
        this.renderRow = this.renderRow.bind(this);
    }

    componentDidUpdate() {
        let items = this.props.items;
        let editingRow = this.state.editingRow;

        for (let i = items.length; i--;) {
            if (i == editingRow) {
                continue;
            }
            if (this._deleteItemIfEmpty(items[i]) && i < editingRow) {
                editingRow--;
            }
        }

        if (editingRow != this.state.editingRow) {
            this.setState({editingRow});
        }
    }

    render() {
        // Clone the items into a new Array to prevent unexpected errors from changes in length.
        let sections = [Array.from(this.props.items)];
        let extraItems = this.props.extraItems;

        if (extraItems && extraItems.length) {
            sections.push(extraItems);
        }

        let dataSource = this.dataSource.cloneWithRowsAndSections(sections);

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
        let RowClass;
        let editing = false;

        if (sectionIndex == 0) {
            RowClass = this.props.rowClass || TodoListItem;
            editing = this.state.editingRow == rowIndex;
        } else if (sectionIndex == 1) {
            RowClass = TodoListExtraItem;
        }

        return (
            <RowClass
                item={item}
                editing={editing}
                onPress={() => this._onPressRow(item, sectionIndex, rowIndex)}
                onPressDelete={() => this._onPressDeleteRow(item)}
                onEndEditing={() => this._onEndEditingRow(item, rowIndex)} />
        );
    }

    _onPressRow(item, sectionIndex, rowIndex) {
        let onPressItem = this.props.onPressItem;
        if (onPressItem) {
            onPressItem(item);
            return;
        }

        // If no handler was provided, then default to editing the row.
        if (sectionIndex == 0) {
            this.setState({editingRow: rowIndex});
        }
    }

    _onPressDeleteRow(item) {
        this._deleteItem(item);
        this.forceUpdate();
    }

    _onEndEditingRow(item, rowIndex) {
        this._deleteItemIfEmpty(item);

        if (this.state.editingRow == rowIndex) {
            this.setState({editingRow: null});
        }
    }

    _deleteItem(item) {
        let items = item.items;

        realm.write(() => {
            // If the item is a TodoList, then delete all of its items.
            if (items && items.length) {
                realm.delete(items);
            }

            realm.delete(item);
        });
    }

    _deleteItemIfEmpty(item) {
        // The item could be a TodoList or a Todo.
        if (!item.name && !item.text) {
            this._deleteItem(item);
            return true;
        }
        return false;
    }
}

class TodoListExtraItem extends TodoListItem {
    renderText() {
        return super.renderText(styles.listItemTextSpecial);
    }

    renderLeftSide() {
        return (
            <View style={styles.listItemLeftSide}>
                <Text style={styles.listItemCount}>
                    {this.props.item.items.length}
                </Text>
            </View>
        );
    }

    renderRightSide() {
        return null;
    }
}

module.exports = TodoListView;

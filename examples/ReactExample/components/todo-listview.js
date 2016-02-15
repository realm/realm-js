/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

const React = require('react-native');
const RealmReact = require('realm/react-native');
const TodoListItem = require('./todo-list-item');
const realm = require('./realm');
const styles = require('./styles');

const { Text, View } = React;
const { ListView } = RealmReact;

class TodoListView extends React.Component {
    constructor(props) {
        super(props);

        let dataSource = new ListView.DataSource({
            rowHasChanged(a, b) {
                // Always re-render TodoList items.
                return a.done !== b.done || a.text !== b.text || a.items || b.items;
            }
        });

        this.state = {
            dataSource: this._cloneDataSource(dataSource, props),
        };

        this.renderRow = this.renderRow.bind(this);
    }

    componentWillReceiveProps(props) {
        this.updateDataSource(props);
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
        return (
            <View style={styles.container}>
                <ListView dataSource={this.state.dataSource} renderRow={this.renderRow} />
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

    updateDataSource(props=this.props) {
        this.setState({
            dataSource: this._cloneDataSource(this.state.dataSource, props),
        });
    }

    _cloneDataSource(dataSource, props) {
        let items = props.items;
        let extraItems = props.extraItems;
        let sections = [items ? items.snapshot() : []];

        if (extraItems && extraItems.length) {
            sections.push(extraItems);
        }

        return dataSource.cloneWithRowsAndSections(sections);
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
        this.updateDataSource();
    }

    _onEndEditingRow(item, rowIndex) {
        if (this._deleteItemIfEmpty(item)) {
            this.updateDataSource();
        }
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
                <View style={styles.listItemCount}>
                    <Text style={styles.listItemCountText}>
                        {this.props.item.items.length}
                    </Text>
                </View>
            </View>
        );
    }

    renderRightSide() {
        return null;
    }
}

module.exports = TodoListView;

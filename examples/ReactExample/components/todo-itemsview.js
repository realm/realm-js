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
    Text,
    View,
} from 'react-native';

import { ListView } from 'realm/react-native';
import TodoItem from './todo-item';
import realm from './realm';
import styles from './styles';

export default class TodoItemsView extends React.Component {
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
                <ListView dataSource={this.state.dataSource} renderRow={this.renderRow} enableEmptySections/>
                <Text style={styles.instructions}>
                    Press Cmd+R to reload,{'\n'}
                    Cmd+D for dev menu
                </Text>
            </View>
        );
    }

    renderRow(item, sectionIndex, rowIndex) {
        let editing = false;

        return (
            <TodoItem
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

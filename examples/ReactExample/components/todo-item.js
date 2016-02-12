/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

const React = require('react-native');
const TodoListItem = require('./todo-list-item');
const realm = require('./realm');
const styles = require('./styles');

const { Text, TouchableWithoutFeedback, View } = React;

class TodoItem extends TodoListItem {
    constructor(props) {
        super(props);

        this._onPressCheckbox = this._onPressCheckbox.bind(this);
    }

    get done() {
        return this.props.item.done;
    }

    set done(done) {
        this.props.item.done = done;
    }

    get text() {
        return this.props.item.text;
    }

    set text(text) {
        this.props.item.text = text;
    }

    renderLeftSide() {
        return (
            <TouchableWithoutFeedback onPress={this._onPressCheckbox}>
                <View style={styles.listItemLeftSide}>
                    <View style={styles.listItemCheckbox}>
                        <Text style={styles.listItemCheckboxText}>
                            {this.done ? '✓' : ''}
                        </Text>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        );
    }

    _onPressCheckbox() {
        realm.write(() => {
            this.done = !this.done;
        });

        this.forceUpdate();
    }
}

module.exports = TodoItem;

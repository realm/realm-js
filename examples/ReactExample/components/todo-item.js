'use strict';

const React = require('react-native');
const TodoItemCheckbox = require('./todo-item-checkbox');
const realm = require('./realm');
const styles = require('./styles');

const { Text, TextInput, View } = React;

class TodoItem extends React.Component {
    constructor(props) {
        super(props);

        this._onChangeText = this._onChangeText.bind(this);
        this._onPressCheckbox = this._onPressCheckbox.bind(this);
    }

    componentDidMount() {
        // The autoFocus prop on TextInput was not working for us :(
        this._focusInputIfNecessary();
    }

    componentDidUpdate() {
        this._focusInputIfNecessary();
    }

    render() {
        let item = this.props.item;
        let contents;

        if (this.props.editing) {
            contents = (
                <TextInput
                    ref="input"
                    value={item.text}
                    placeholder="Call Mom"
                    style={styles.listItemInput}
                    onChangeText={this._onChangeText}
                    onEndEditing={this.props.onEndEditing}
                    enablesReturnKeyAutomatically={true} />
            );
        } else {
            contents = (
                <Text
                    style={styles.listItemText}
                    onPress={this.props.onPress}
                    suppressHighlighting={true}>
                    {item.text}
                </Text>
            );
        }

        return (
            <View style={styles.listItem}>
                <TodoItemCheckbox checked={item.done} onPress={this._onPressCheckbox} />
                {contents}
            </View>
        );
    }

    _onChangeText(text) {
        realm.write(() => {
            this.props.item.text = text;
        });

        this.forceUpdate();
    }

    _onPressCheckbox() {
        let item = this.props.item;
        realm.write(() => {
            item.done = !item.done;
        });

        this.forceUpdate();
    }

    _focusInputIfNecessary() {
        if (!this.props.editing) {
            return;
        }

        let input = this.refs.input;
        if (!input.isFocused()) {
            input.focus();
        }
    }
}

module.exports = TodoItem;

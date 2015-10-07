'use strict';

const React = require('react-native');
const realm = require('./realm');
const styles = require('./styles');

const { Text, TextInput, View } = React;

class TodoItem extends React.Component {
    constructor(props) {
        super(props);

        this._onChangeText = this._onChangeText.bind(this);
    }

    componentDidMount() {
        // The autoFocus prop on TextInput was not working for us :(
        this._focusInputIfNecessary();
    }

    componentDidUpdate() {
        this._focusInputIfNecessary();
    }

    render() {
        let contents;

        if (this.props.editing) {
            contents = (
                <TextInput
                    ref="input"
                    value={this.props.item.text}
                    placeholder="Call Mom"
                    style={styles.listItemText}
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
                    {this.props.item.text}
                </Text>
            );
        }

        return (
            <View style={styles.listItem}>
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

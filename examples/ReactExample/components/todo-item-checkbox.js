'use strict';

const React = require('react-native');
const styles = require('./styles');

const { Text, TouchableWithoutFeedback, View } = React;

class TodoItemCheckbox extends React.Component {
    render() {
        return (
            <TouchableWithoutFeedback onPress={this.props.onPress}>
                <View style={styles.listItemCheckboxContainer}>
                    <View style={styles.listItemCheckbox}>
                        <Text>{this.props.checked ? '✓' : ''}</Text>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        );
    }
}

module.exports = TodoItemCheckbox;

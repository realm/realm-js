'use strict';

const React = require('react-native');
const styles = require('./styles');

const { Text, TouchableWithoutFeedback, View } = React;

class TodoItemDelete extends React.Component {
    render() {
        return (
            <TouchableWithoutFeedback onPress={this.props.onPress}>
                <View style={styles.listItemDelete}>
                    <Text>𐄂</Text>
                </View>
            </TouchableWithoutFeedback>
        );
    }
}

module.exports = TodoItemDelete;

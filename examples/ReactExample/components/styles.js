'use strict';

const React = require('react-native');

module.exports = React.StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: '#ffffff',
    },
    listItem: {
        padding: 12,
        borderColor: "#c8c7cc",
        borderBottomWidth: 0.5,
        alignItems: 'center',
        alignSelf: 'stretch',
        flexDirection: 'row',
        flex: 1,
        height: 44,
    },
    listItemText: {
        fontFamily: 'System',
        fontSize: 15,
        flexDirection: 'column',
        flex: 1,
        lineHeight: 16,
    },
    instructions: {
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5,
    }
});

'use strict';

const React = require('react-native');

module.exports = React.StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: '#ffffff',
    },
    navigator: {
        flex: 1,
    },
    listItem: {
        borderColor: "#c8c7cc",
        borderBottomWidth: 0.5,
        alignItems: 'stretch',
        alignSelf: 'stretch',
        flexDirection: 'row',
        flex: 1,
        height: 44,
    },
    listItemLeftSide: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
    },
    listItemCheckbox: {
        borderColor: "#000",
        borderWidth: 0.5,
        width: 16,
        height: 16,
    },
    listItemInput: {
        fontFamily: 'System',
        fontSize: 15,
        flexDirection: 'column',
        flex: 1,
    },
    listItemText: {
        fontFamily: 'System',
        fontSize: 15,
        flexDirection: 'column',
        flex: 1,
        lineHeight: 30,
    },
    listItemTextSpecial: {
        fontStyle: 'italic',
    },
    listItemDelete: {
        paddingLeft: 12,
        paddingRight: 12,
        flexDirection: 'column',
        justifyContent: 'center',
    },
    instructions: {
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5,
    }
});

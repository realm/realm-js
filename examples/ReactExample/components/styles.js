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
        borderColor: "#c8c7cc",
        borderBottomWidth: 0.5,
        alignItems: 'stretch',
        alignSelf: 'stretch',
        flexDirection: 'row',
        flex: 1,
        height: 44,
    },
    listItemCheckboxContainer: {
        paddingLeft: 12,
        paddingRight: 4,
        flexDirection: 'column',
        justifyContent: 'center',
    },
    listItemCheckbox: {
        borderColor: "#000",
        borderWidth: 0.5,
        marginRight: 8,
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

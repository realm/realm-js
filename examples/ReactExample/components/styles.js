/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

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
        borderColor: '#ccc',
        borderWidth: 1,
        textAlign: 'center',
        width: 16,
        height: 16,
        lineHeight: 14,
    },
    listItemCount: {
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 12,
        width: 24,
        height: 18,
        lineHeight: 16,
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

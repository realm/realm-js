/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

const React = require('react-native');

const { Navigator, StyleSheet } = React;

const NAVBAR_HEIGHT = Navigator.NavigationBar.Styles.General.TotalNavHeight;

module.exports = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: '#ffffff',
    },
    navigator: {
        flex: 1,
    },
    navBar: {
        backgroundColor: '#f0727d',
    },
    navBarLeftArrow: {
        fontSize: 36,
        fontWeight: '200',
        lineHeight: 26,
        letterSpacing: 2,
    },
    navBarLeftButton: {
        paddingLeft: 8,
    },
    navBarRightButton: {
        paddingRight: 8,
    },
    navBarText: {
        color: '#ffffff',
        fontSize: 18,
        marginVertical: 10,
    },
    navBarTitle: {
        fontWeight: '500',
    },
    navScene: {
        top: NAVBAR_HEIGHT,
    },
    listItem: {
        borderColor: '#c8c7cc',
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

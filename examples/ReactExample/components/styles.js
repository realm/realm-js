////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

'use strict';

import {
    Platform,
    StyleSheet
} from 'react-native';

const iOS = (Platform.OS == 'ios');


export default StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: '#fff',
    },
    navigator: {
        flex: 1,
    },
    navBar: {
        backgroundColor: '#f0727d',
    },
    navBarView: {
        alignItems: 'center',
        flexDirection: 'row',
        height: 20,
    },
    navBarLeftArrow: {
        color: '#fff',
        fontSize: 40,
        fontWeight: '200',
        letterSpacing: 2,
        marginTop: -6,
    },
    navBarLeftButton: {
        paddingLeft: 8,
    },
    navBarRightButton: {
        paddingRight: 8,
    },
    navBarText: {
        color: '#fff',
        fontSize: 18,
    },
    navBarTitleText: {
        fontWeight: '500',
    },
    navScene: {
        top: 20,
    },
    listItem: {
        borderColor: '#c8c7cc',
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'stretch',
        alignSelf: 'stretch',
        justifyContent: 'center',
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
        width: 16,
        height: 16,
    },
    listItemCheckboxText: {
        width: 14,
        height: 14,
        fontSize: iOS ? 14 : 10,
        textAlign: 'center',
    },
    listItemCount: {
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        width: 24,
        height: 18,
    },
    listItemCountText: {
        backgroundColor: 'transparent',
        fontSize: iOS ? 12 : 11,
        textAlign: 'center',
    },
    listItemInput: {
        fontFamily: 'System',
        fontSize: 15,
        flexDirection: 'column',
        flex: 1,
    },
    listItemText: {
        alignSelf: 'center',
        fontFamily: 'System',
        fontSize: 15,
        flexDirection: 'column',
        flex: 1,
    },
    listItemTextSpecial: {
        fontStyle: 'italic',
    },
    listItemDelete: {
        backgroundColor: 'transparent',
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

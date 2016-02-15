/* Copyright 2016 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

import {
    getRootComponent,
    assertChildExists,
} from './util';

export default {
    async testTodoAppRendered() {
        assertChildExists(await getRootComponent(), 'TodoApp');
    },
}
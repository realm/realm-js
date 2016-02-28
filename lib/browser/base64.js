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

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CHAR_MAP = {};

Array.from(CHARS, (char, i) => CHAR_MAP[char] = i);

export function decode(base64) {
    let length = base64.length;
    let byteCount = length * 0.75;

    if (base64[length - 1] === '=') {
        byteCount--;
        if (base64[length - 2] === '=') {
            byteCount--;
        }
    }

    let buffer = new ArrayBuffer(byteCount);
    let bytes = new Uint8Array(buffer);

    for (let i = 0, j = 0; i < length; i += 4) {
        let index1 = CHAR_MAP[base64[i]];
        let index2 = CHAR_MAP[base64[i + 1]];
        let index3 = CHAR_MAP[base64[i + 2]];
        let index4 = CHAR_MAP[base64[i + 3]];

        bytes[j++] = (index1 << 2) + ((index2 & 0x30) >> 4);
        bytes[j++] = ((index2 & 0x0f) << 4) + ((index3 & 0x3c) >> 2);
        bytes[j++] = ((index3 & 0x03) << 6) + index4;
    }

    return buffer;
}

export function encode(data) {
    var byteOffset = 0;
    var buffer;

    if (data instanceof ArrayBuffer) {
        buffer = data;
    } else if (ArrayBuffer.isView(data)) {
        buffer = data.buffer;
        byteOffset = data.byteOffset;
    } else {
        throw new TypeError('Can only base64 encode ArrayBuffer and ArrayBufferView objects');
    }

    let byteCount = data.byteLength;
    let bytes = new Uint8Array(buffer, byteOffset, byteCount);
    let base64 = '';

    for (let i = 0; i < byteCount; i += 3) {
        base64 += CHARS[(bytes[i] & 0xfc) >> 2];
        base64 += CHARS[((bytes[i] & 0x03) << 4) + ((bytes[i + 1] & 0xf0) >> 4)];
        base64 += CHARS[((bytes[i + 1] & 0x0f) << 2) + ((bytes[i + 2] & 0xc0) >> 6)];
        base64 += CHARS[bytes[i + 2] & 0x3f];
    }

    switch (byteCount % 3) {
        case 1:
            return base64.slice(0, -2) + '==';
        case 2:
            return base64.slice(0, -1) + '=';
        default:
            return base64;
    }
}

/*
    From: http://www.adp-gmbh.ch/cpp/common/base64.html

    base64.hpp and base64.cpp

    Copyright (C) 2004-2008 René Nyffenegger

    This source code is provided 'as-is', without any express or implied
    warranty. In no event will the author be held liable for any damages
    arising from the use of this software.

    Permission is granted to anyone to use this software for any purpose,
    including commercial applications, and to alter it and redistribute it
    freely, subject to the following restrictions:

    1. The origin of this source code must not be misrepresented; you must not
       claim that you wrote the original source code. If you use this source code
       in a product, an acknowledgment in the product documentation would be
       appreciated but is not required.

    2. Altered source versions must be plainly marked as such, and must not be
       misrepresented as being the original source code.

    3. This notice may not be removed or altered from any source distribution.

    René Nyffenegger rene.nyffenegger@adp-gmbh.ch

    This file was modified by jmarantz@google.com to:
      - Add a static map and an initializer function
      - add a web-safe variant that uses '-' and '_' in lieu of '+' and '/'
      - change the 'decode' interface to return false if the input contains
        characters not in the expected char-set.
      - removed is_base64 helper function and instead rely on the char_maps.
      - use a static constant for the padding character '='
 */

#include "base64.hpp"

static const char base64_chars[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789+/";

static const char web64_chars[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789-_";

static unsigned int base64_char_map[256], web64_char_map[256];
static bool initialized = false;
static const unsigned int kInvalidChar = 0xffffffff;
static const char kPadChar = '=';

// Be sure to call this function before calling any other functions
// in this file when using multiple threads.
void base64_init() {
    if (!initialized) {
        initialized = true;
        for (int i = 0; i < 256; ++i) {
            base64_char_map[i] = kInvalidChar;
            web64_char_map[i] = kInvalidChar;
        }
        for (int i = 0; i < sizeof(base64_chars) - 1; ++i) {
            base64_char_map[base64_chars[i]] = i;
        }
        for (int i = 0; i < sizeof(web64_chars) - 1; ++i) {
            web64_char_map[web64_chars[i]] = i;
        }
    }
}

static inline std::string encode(
        const char* char_set, unsigned char const* bytes_to_encode,
        size_t in_len) {
    base64_init();
    std::string ret;
    size_t i = 0;
    size_t j = 0;
    unsigned char char_array_3[3];
    unsigned char char_array_4[4];

    while (in_len--) {
        char_array_3[i++] = *(bytes_to_encode++);
        if (i == 3) {
            char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
            char_array_4[1] = ((char_array_3[0] & 0x03) << 4) +
            ((char_array_3[1] & 0xf0) >> 4);
            char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) +
            ((char_array_3[2] & 0xc0) >> 6);
            char_array_4[3] = char_array_3[2] & 0x3f;

            for (i = 0; i < 4 ; i++)
                ret += char_set[char_array_4[i]];
            i = 0;
        }
    }

    if (i) {
        for (j = i; j < 3; j++) {
            char_array_3[j] = '\0';
        }

        char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
        char_array_4[1] = ((char_array_3[0] & 0x03) << 4) +
        ((char_array_3[1] & 0xf0) >> 4);
        char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) +
        ((char_array_3[2] & 0xc0) >> 6);
        char_array_4[3] = char_array_3[2] & 0x3f;

        for (j = 0; (j < i + 1); j++)
            ret += char_set[char_array_4[j]];

        while ((i++ < 3)) {
            ret += kPadChar;
        }
    }

    return ret;
}

static inline bool decode(
        unsigned int* char_map, const std::string& encoded_string,
        std::string* output) {
    base64_init();
    size_t in_len = encoded_string.size();
    size_t i = 0;
    size_t j = 0;
    size_t in_ = 0;
    unsigned char char_array_4[4], char_array_3[3];

    while (in_len-- && (encoded_string[in_] != kPadChar)) {
        char_array_4[i++] = encoded_string[in_];
        in_++;
        if (i == 4) {
            for (i = 0; i < 4; i++) {
                unsigned int char_index = char_map[char_array_4[i]];
                if (char_index == kInvalidChar) {
                    return false;
                }
                char_array_4[i] = char_index;
            }

            char_array_3[0] = (char_array_4[0] << 2) +
            ((char_array_4[1] & 0x30) >> 4);
            char_array_3[1] = ((char_array_4[1] & 0xf) << 4) +
            ((char_array_4[2] & 0x3c) >> 2);
            char_array_3[2] = ((char_array_4[2] & 0x3) << 6) + char_array_4[3];

            for (i = 0; (i < 3); i++)
                *output += char_array_3[i];
            i = 0;
        }
    }

    if (i) {
        for (j = i; j < 4; j++)
            char_array_4[j] = 0;

        for (j = 0; j < i; j++) {
            unsigned int char_index = char_map[char_array_4[j]];
            if (char_index == kInvalidChar) {
                return false;
            }
            char_array_4[j] = char_index;
        }

        char_array_3[0] = (char_array_4[0] << 2) + ((char_array_4[1] & 0x30) >> 4);
        char_array_3[1] = ((char_array_4[1] & 0xf) << 4) +
        ((char_array_4[2] & 0x3c) >> 2);
        char_array_3[2] = ((char_array_4[2] & 0x3) << 6) + char_array_4[3];

        for (j = 0; (j < i - 1); j++) {
            *output += char_array_3[j];
        }
    }

    return true;
}


std::string base64_encode(unsigned char const* bytes_to_encode,
                          size_t in_len) {
    return encode(base64_chars, bytes_to_encode, in_len);
}

std::string web64_encode(unsigned char const* bytes_to_encode,
                         size_t in_len) {
    return encode(web64_chars, bytes_to_encode, in_len);
}

bool base64_decode(const std::string& encoded_string, std::string* output) {
    return decode(base64_char_map, encoded_string, output);
}

bool web64_decode(const std::string& encoded_string, std::string* output) {
    return decode(web64_char_map, encoded_string, output);
}

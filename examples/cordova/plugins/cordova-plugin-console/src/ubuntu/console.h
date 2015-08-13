/*
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

#ifndef CONSOLE_H_FDSVCXGFRS
#define CONSOLE_H_FDSVCXGFRS

#include <cplugin.h>

#include <QtCore>

class Console : public CPlugin {
    Q_OBJECT
public:
    explicit Console(Cordova *cordova);

    virtual const QString fullName() override {
        return Console::fullID();
    }

    virtual const QString shortName() override {
        return "Console";
    }

    static const QString fullID() {
        return "Console";
    }

public slots:
    void logLevel(int scId, int ecId, QString level, QString message);
};

#endif

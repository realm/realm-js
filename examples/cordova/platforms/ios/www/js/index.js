/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

function Todo() {}
Todo.prototype.schema = {
    name: 'Todo',
    properties: [
        {name: 'text', type: 'RealmTypeString'},
    ]
};

function realm() {
    return new Realm({schema: [Todo]});
}

function deleteTodo(index) {
    realm().write(function() {
        realm().delete(realm().objects("Todo")[index]);
    });
    updateItems();
}

function updateItems() {
    var itemsHTML = "";
    var todos = realm().objects("Todo");
    for (var todo in todos) {
        itemsHTML += "<div class='todoContainer'><div class='todoItem'>" + todos[todo].text + 
            "</div><button class='deleteButton' onclick='deleteTodo(" + todo + ");'>Complete</button></div>";
    }

    var items = document.getElementById('items');
    items.innerHTML = itemsHTML;
}

function addTodo() {
    realm().write(function() {
        var input = document.getElementById('todoInput');
        realm().create("Todo", [input.value]);
        input.value = "";
    });
    updateItems();
}

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
        document.getElementById('todoButton').addEventListener('click', function() {
            addTodo();
            return false;
        }.bind(this));
        document.getElementById('todoInput').addEventListener('keypress', function(e) {
            if (e.keyCode == 13) {
                addTodo();
            }
            return false;
        }.bind(this));
        updateItems();
    },
    addTodo: function(todo) {

    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        console.log('Received Event: ' + id);
    }
};

app.initialize();


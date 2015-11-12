/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

/* global Realm */

'use strict';

var app = {
    initialize: function() {
        // Bind any events that are required on startup. Common events are:
        // 'load', 'deviceready', 'offline', and 'online'.
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },
    onDeviceReady: function() {
        var schema = {
            name: 'Todo',
            properties: [
                {name: 'text', type: Realm.Types.STRING},
            ]
        };

        this.realm = new Realm({schema: [schema]});

        this.itemsContainer = document.getElementById('todo-items');
        this.addButton = document.getElementById('todo-button');
        this.input = document.getElementById('todo-input');

        this.addButton.addEventListener('click', function() {
            this.addTodo();
            return false;
        }.bind(this), false);

        this.input.addEventListener('keypress', function(event) {
            if (event.keyCode == 13) {
                this.addTodo();
                return false;
            }
        }.bind(this), false);

        this.updateItems();
    },
    updateItems: function() {
        var todos = this.realm.objects('Todo');
        var container = this.itemsContainer;
        container.innerHTML = '';

        for (var i = 0, len = todos.length; i < len; i++) {
            var todo = todos[i];

            var todoContainer = document.createElement('div');
            todoContainer.className = 'todo-container';

            var todoItem = todoContainer.appendChild(document.createElement('div'));
            todoItem.className = 'todo-item';
            todoItem.textContent = todo.text;

            var deleteButton = todoContainer.appendChild(document.createElement('button'));
            deleteButton.className = 'delete-button';
            deleteButton.textContent = 'Complete';
            deleteButton.addEventListener('click', this.deleteTodo.bind(this, todo), false);

            container.appendChild(todoContainer);
        }
    },
    addTodo: function() {
        var input = this.input;
        var text = input.value;
        if (!text) {
            return;
        }

        input.value = '';

        var realm = this.realm;
        realm.write(function() {
            realm.create('Todo', {text: text});
        });

        this.updateItems();
    },
    deleteTodo: function(todo) {
        var realm = this.realm;
        realm.write(function() {
            realm.delete(todo);
        });

        this.updateItems();
    },
};

app.initialize();

/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';

var React = require('react-native');

var {
  AppRegistry,
  StyleSheet,
  NavigatorIOS,
  AlertIOS,
  ListView,
  TouchableHighlight,
  Text,
  TextInput,
  View,
} = React;

var TodoItemSchema = {
  name: 'Todo',
  properties: [
    {name: 'text', type: Realm.Types.STRING},
  ]
};
var TodoListSchmea = {
    name: 'TodoList',
    properties: [
      {name: 'name', type: Realm.Types.STRING},
      {name: 'items', type: Realm.Types.LIST, objectType: 'Todo'}
    ]
};

console.log(Realm.defaultPath);
var realm = new Realm({schema: [TodoItemSchema, TodoListSchmea]});

class Edit extends React.Component {
    componentWillMount() {
        this.setState({text: this.props.text});
    }

    save() {
        realm.write(function () {
            if (this.props.todoId == this.props.list.items.length) {
                this.props.list.items.push({text: this.state.text});
            }
            else {
                var todoItem = this.props.list.items[this.props.todoId];
                todoItem.text = this.state.text;
            }
        }.bind(this));
        // should not be needed once we have notifications
        this.props.parent.updateDataSource();
        this.props.navigator.pop();
    }

    render() {
        return (
            <View style={{flex:1, justifyContent: 'flex-start'}}>
                <TextInput multiline={true} style={styles.textInput}
                    placeholder='Enter Todo' autoFocus={true}
                    onChangeText={(text) => this.setState({text})} value={this.state.text}/>
                <TouchableHighlight
                    style={styles.button}
                    onPress={this.save.bind(this)}
                    underlayColor='#99d9f4'>
                    <Text style={styles.buttonText}>Save</Text>
                </TouchableHighlight>
            </View>
        )
    }
};

class TodoList extends React.Component {
    componentWillMount() {
        this.lists = realm.objects('TodoList');
        if (this.lists.length < 1) {
          realm.write(function() {
            realm.create('TodoList', ['List', []]);
          });
        }
        this.list = this.lists[0];
        this.menu = this.menu.bind(this);
        this.delete = this.delete.bind(this);
        var dataSource = new ListView.DataSource({
            rowHasChanged: (row1, row2) => row1 !== row2
        });

        this.updateDataSource(dataSource);
    }

    updateDataSource(oldDataSource) {
        if (!oldDataSource) {
            oldDataSource = this.state.dataSource;
        }
        this.setState({dataSource: oldDataSource.cloneWithRows(this.list.items)});
    }

    menu(todo, todoID) {
        AlertIOS.alert(
            todo.text,
            todoID,
            [
                {text: 'Complete', onPress: () => this.delete(todoID)},
                {text: 'Edit', onPress: () => this.edit(todoID, todo.text)},
                {text: 'Cancel'}
            ]
        )
    }

    delete(todoID) {
        var item = this.list.items[todoID];
        realm.write(function() {
            realm.delete(item);
        })
        this.updateDataSource();
    }

    edit(todoId, text) {
        this.props.navigator.push({
            title: text,
            component: Edit,
            passProps: {list: this.list, todoId: todoId, text: text, parent: this}
        });
    }

    render() {
        return (
          <View style={styles.container}>
            <ListView style={styles.listView} dataSource={this.state.dataSource} renderRow={(rowData, sectionID, rowID) =>
              <TouchableHighlight style={styles.listItem} onPress={() => this.menu(rowData, rowID)}>
                <Text>{rowData.text}</Text>
              </TouchableHighlight>
            }/>
            <TouchableHighlight style={styles.button} 
                onPress={() => this.edit(this.list.items.length, "")}>
                <Text style={styles.buttonText}>+</Text>
            </TouchableHighlight>
            <Text style={styles.instructions}>
              Press Cmd+R to reload,{'\n'}
              Cmd+Control+Z for dev menu
            </Text>
          </View>
        );
    }
};

class Navigator extends React.Component {
  render() {        
    return (
      <NavigatorIOS initialRoute={{component: TodoList, title: 'Todo Items'}} style={{flex:1}}/>
    );
  }
};
AppRegistry.registerComponent('ReactExample', () => Navigator);

var styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    backgroundColor: '#ffffff',
  },
  listItem: {
    marginTop: 3,
    padding: 6,
    backgroundColor:'#ACACAC',
    alignSelf: 'stretch',
    flexDirection: 'row',
    flex:1,
  },
  textInput: {
    alignSelf: 'stretch',
    borderWidth: 0.5,
    borderColor: '#0f0f0f',
    height: 200,
    fontSize: 13,
    margin: 6,
    marginTop: 70,
    padding: 4,
  },
  button: {
    height: 36,
    backgroundColor: '#48BBEC',
    alignSelf: 'stretch',
    justifyContent: 'center'
  },
  buttonText: {
    alignSelf: 'center',
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
   }
});

/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';

var React = require('react-native');
require('NativeModules').Realm;

var {
  AppRegistry,
  StyleSheet,
  ListView,
  Text,
  View,
} = React;

var Person = function() {}
Person.prototype.schema = {
  name: 'Person',
  properties: [
    {name: 'name', type: RealmType.String},
    {name: 'age',  type: RealmType.Double},
  ]
};
Person.prototype.capitalName = function() {
  return this.name.toUpperCase();
};

var RealmReact = React.createClass({
  getInitialState: function() {
    return {
      dataSource: new ListView.DataSource({
        rowHasChanged: (row1, row2) => row1 !== row2,
      }),
    };
  },
  renderPerson: function(person) {
    return (
      <View style={styles.container}>
          <Text>{person.capitalName()} {person.age}</Text>
      </View>
    );
  },
  render: function() {
    return (
      <View style={styles.container}>
        <ListView dataSource={this.state.dataSource} renderRow={this.renderPerson} style={styles.listView}/>
        <Text style={styles.instructions}>
          Press Cmd+R to reload,{'\n'}
          Cmd+Control+Z for dev menu
        </Text>
      </View>
    );
  }, 
  componentDidMount: function() {
    var realm = new Realm({schema: [Person]});
    var objects = realm.objects('Person');
    
		console.log(realm.path);

    if (objects.length < 4) {
      realm.write(function() {
      	realm.create('Person', ['Joe', 26]);
        realm.create('Person', ['Sam', 20]);
      	realm.create('Person', ['Alexander', 37]);
      	realm.create('Person', ['Ari', 34]);
        realm.create('Person', {'name': 'Bjarne', age: 37});
      });
    }

    var olderThan30 = realm.objects('Person', 'age > 30');
          console.log(olderThan30.length);

    this.setState({
    	dataSource: this.state.dataSource.cloneWithRows(olderThan30),
    });
  },
});

var styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  listView: {
    paddingTop: 20,
    backgroundColor: '#F5FCFF',
  },
});

AppRegistry.registerComponent('RealmReact', () => RealmReact);

/**
 * This is an install test App component, which:
 * 1) Imports and uses Realm JS
 * 2) Sends a request to a webserver on http://localhost:1337
 */

import React from 'react';
import {Text, View} from 'react-native';
import Realm from 'realm';

export default class App extends React.Component {
  state = {};

  componentDidMount() {
    this.realm = new Realm({
      schema: [{name: 'Person', properties: {name: 'string'}}],
    });

    // Delete everything if the Realm is not already empty
    if (!this.realm.empty) {
      this.realm.write(() => {
        this.realm.deleteAll();
      });
    }

    // Create a couple of people
    this.realm.write(() => {
      this.realm.create('Person', {name: 'Alice'});
      this.realm.create('Person', {name: 'Bob'});
      this.realm.create('Person', {name: 'Charlie'});
    });

    // Post to the webserver waiting for a response
    fetch('http://localhost:1337', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        people: this.realm.objects('Person'),
      }),
    }).then(null, err => {
      this.setState({err});
    });

    this.forceUpdate();
  }

  render() {
    return (
      <View
        style={{
          justifyContent: 'center',
          padding: 10,
          height: '100%',
        }}>
        {this.state.err ? (
          <Text>{this.state.err.stack}</Text>
        ) : this.realm ? (
          <Text>
            People:{' '}
            {this.realm
              .objects('Person')
              .map(p => p.name)
              .join(', ')}
          </Text>
        ) : null}
      </View>
    );
  }
}

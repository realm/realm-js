'use strict';

import React from 'react';
import { AsyncStorage, Text, TextInput, View } from 'react-native';
import Realm from 'realm';
import styles from './styles';
import TodoApp from './todo-app';


export default class LoginScreen extends React.Component {

    constructor (props) {
        super(props);
        this.state = {login: 'user', password: '...'};
        this._submit = this.submit.bind(this);
    }

    componentDidMount () {
        AsyncStorage.getItem('creds').then( value_str => {
            console.log('CREDS', value_str);
            if (value_str) {
                const value = JSON.parse(value_str);
                this.setState({
                    login: value.login||'user',
                    password: value.password||'password'
                });
            }
        } ).done();
    }

    submit () {
        console.log('LOGIN')
        Realm.Sync.User.login(
            "http://192.168.157.64:9080/",
            this.state.login,
            this.state.password,
            (error, user) => {
                if (error) {
                    this.state.error = error;
                    this.forceUpdate();
                } else {
                    delete this.state.error;
                    AsyncStorage.setItem('creds', JSON.stringify(this.state));

                    console.log('BINGO');
                    this.setState({
                        login:      this.state.login,
                        password:   this.state.password,
                        done:       true
                    });

                }
            }
        );
    }

    render () {
        if (this.state.done)
            return <TodoApp/>;
        return (
            <View style={[styles.loginView]}>
                <View style={[styles.loginRow]}>
                    <Text style={styles.loginTitle}>RealmTasks</Text>
                </View>
                <View style={[styles.loginRow]}>
                    <Text style={styles.loginLabel1}>Login:</Text>
                </View>
                <View style={[styles.loginRow]}>
                    <TextInput style={styles.loginInput1}
                        value={this.state.login}
                        onChangeText={ login => this.setState({
                            login,
                            password: this.state.password
                        }) }
                        editable = {true}
                        maxLength = {40}
                    ></TextInput>
                </View>
                <View style={[styles.loginRow]}>
                    <Text style={styles.loginLabel2}>Password:</Text>
                </View>
                <View style={[styles.loginRow]}>
                    <TextInput
                        style={styles.loginInput2}
                        value={this.state.password}
                        onChangeText={ password => this.setState({
                            login: this.state.login,
                            password
                        }) }
                        editable = {true}
                        maxLength = {40}
                        onSubmitEditing={this._submit}
                    />
                </View>
                <View style={[styles.loginRow]}>
                    <Text style={styles.loginErrorLabel}>{this.state.error}</Text>
                </View>
            </View>
        );
    }

};

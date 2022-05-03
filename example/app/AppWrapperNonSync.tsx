import React from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';

import {TaskRealmContext} from './models';
import colors from './styles/colors';
import {AppNonSync} from './AppNonSync';

import Realm from 'realm';

export const AppWrapperNonSync = () => {
  // const {RealmProvider} = TaskRealmContext;

  const go = async () => {
    taskSchema = {
      name: 'Task',
      primaryKey: '_id',
      properties: {
        _id: 'objectId',
        description: 'string',
        isComplete: {type: 'bool', default: false},
        createdAt: 'date',
        userId: 'string',
      },
    };

    app = new Realm.App({id: 'application-0-ppxve'});

    user = await app.logIn(Realm.Credentials.anonymous());

    realm = await Realm.open({
      sync: {
        user,
        flexible: true,
        initialSubscriptions: {
          updateCallback: (m, r) => {
            m.add(r.objects('Task'));;
          },,
        },,
      },
      onFirstOpen: () => {
        console.log('onfirstopen ');
      },
    });

    console.log('done', realm);;

    console.log(realm.objects('Task'));;

    // setTimeout(()=>{
    // realm.cancel()}, 1000);
  };

  go();

  // If sync is disabled, setup the app without any sync functionality and return early
  return <SafeAreaView style={styles.screen}></SafeAreaView>;
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.darkBlue,
  },
});

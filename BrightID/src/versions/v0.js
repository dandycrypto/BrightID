// @flow

import AsyncStorage from '@react-native-community/async-storage';
import { b64ToUrlSafeB64, objToUint8, uInt8ArrayToB64 } from '@/utils/encoding';
import {
  setUserData,
  setUserId,
  setConnections,
  setApps,
  removeSafePubKey,
} from '@/actions';
import { saveSecretKey } from '@/utils/keychain';
import { defaultSort } from '@/components/Connections/models/sortingUtility';
import store from '@/store';
import { compose } from 'ramda';

const keyToString = compose(uInt8ArrayToB64, objToUint8);

export const bootstrapV0 = async (navigation: navigation) => {
  try {
    // load user data from async storage
    let userData = await AsyncStorage.getItem('userData');
    if (userData !== null) {
      userData = JSON.parse(userData);
      // convert private key to uInt8Array
      await saveSecretKey(
        userData.id ?? 'empty',
        keyToString(userData.secretKey),
      );
      // update redux store
      await store.dispatch(setUserData(userData));
    } else {
      throw new Error('unable to recover user data');
    }
  } catch (err) {
    err instanceof Error ? console.warn(err.message) : console.log(err);
    throw new Error('unable to recover user data');
  }
};

export const getConnections = async (allKeys: string[]) => {
  try {
    const connectionKeys = allKeys.filter(
      (val) =>
        val !== 'userData' &&
        !val.startsWith('App:') &&
        !val.startsWith('store'),
    );
    console.log('connectionKeys', connectionKeys);
    const storageValues = await AsyncStorage.multiGet(connectionKeys);
    const connections = storageValues.map((val) => JSON.parse(val[1]));
    // update redux store
    store.dispatch(setConnections(connections));
    store.dispatch(defaultSort());

    // sort connections
  } catch (err) {
    err instanceof Error ? console.warn(err.message) : console.log(err);
    throw new Error('unable to recover connections');
  }
};

export const getApps = async (allKeys: string[]) => {
  try {
    const appKeys = allKeys.filter((key) => key.startsWith('App:'));
    const appValues = await AsyncStorage.multiGet(appKeys);
    // see https://facebook.github.io/react-native/docs/asyncstorage#multiget
    const appInfos = appValues
      .map((val) => JSON.parse(val[1]))
      .sort((a, b) => b.dateAdded - a.dateAdded);

    store.dispatch(setApps(appInfos));
  } catch (err) {
    err instanceof Error ? console.warn(err.message) : console.log(err);
    throw new Error('unable to recover apps');
  }
};

export const verifyConnections = async (allKeys: string[]) => {
  try {
    const connectionKeys = allKeys
      .filter(
        (val) =>
          val !== 'userData' &&
          !val.startsWith('App:') &&
          !val.startsWith('store'),
      )
      .sort();

    const reduxConnectionKeys = store
      .getState()
      .connections.connections.map(({ publicKey, id }) => publicKey || id)
      .sort();
    console.log(
      JSON.stringify(connectionKeys),
      JSON.stringify(reduxConnectionKeys),
    );
    return (
      JSON.stringify(connectionKeys) === JSON.stringify(reduxConnectionKeys)
    );
  } catch (err) {
    err instanceof Error ? console.warn(err.message) : console.log(err);
    throw new Error('unable to verify connections');
  }
};

export const verifyApps = async (allKeys: string[]) => {
  try {
    const appKeys = allKeys.filter((key) => key.startsWith('App:'));
    const appValues = await AsyncStorage.multiGet(appKeys);
    const appInfos = appValues
      .map((val) => JSON.parse(val[1]))
      .sort((a, b) => b.dateAdded - a.dateAdded);

    const { apps } = store.getState().apps;
    console.log(JSON.stringify(appInfos), JSON.stringify(apps));
    return JSON.stringify(appInfos) === JSON.stringify(apps);
  } catch (err) {
    err instanceof Error ? console.warn(err.message) : console.log(err);
    throw new Error('unable to verify apps');
  }
};

export const verifyUserData = async () => {
  try {
    let userData = await AsyncStorage.getItem('userData');
    if (userData !== null) {
      userData = JSON.parse(userData);
      let { publicKey, name, photo } = store.getState().user;
      console.log(
        JSON.stringify(userData.publicKey),
        JSON.stringify(publicKey),
      );
      console.log(userData.name, name);
      console.log(JSON.stringify(userData.photo), JSON.stringify(photo));
      return (
        JSON.stringify(userData.publicKey) === JSON.stringify(publicKey) &&
        userData.name === name &&
        JSON.stringify(userData.photo) === JSON.stringify(photo)
      );
    } else {
      throw new Error('unable to verify user data');
    }
  } catch (err) {
    err instanceof Error ? console.warn(err.message) : console.log(err);
    throw new Error('unable to verify user data');
  }
};

export const upgradeConnsAndIds = () => {
  const { publicKey } = store.getState().user;
  const { connections } = store.getState().connections;
  const id = b64ToUrlSafeB64(publicKey);
  store.dispatch(setUserId(id));
  const nextConn = connections.map((conn) => {
    if (conn.publicKey) {
      conn.id = b64ToUrlSafeB64(conn.publicKey);
      conn.status = 'verified';
    }
    return conn;
  });
  store.dispatch(setConnections(nextConn));
  store.dispatch(removeSafePubKey());
};

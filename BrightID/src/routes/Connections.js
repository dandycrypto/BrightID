import * as React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import Material from 'react-native-vector-icons/MaterialCommunityIcons';
import ConnectionsScreen from '@/components/Connections/ConnectionsScreen';
import SortingConnectionsScreen from '@/components/Connections/SortingConnectionsScreen';
import SearchConnections from '@/components/Connections/SearchConnections';
import { DEVICE_IOS } from '@/utils/constants';
import { createFakeConnection } from '@/components/Connections/models/createFakeConnection';
import { navigate } from '@/NavigationService';
import backArrow from '@/static/back_arrow.svg';
import { SvgXml } from 'react-native-svg';
import { store } from '@/store';
import { headerOptions } from './helpers';

const Stack = createStackNavigator();

const connectionsScreenOptions = {
  ...headerOptions,
  headerRight: __DEV__
    ? () => (
        <TouchableOpacity
          testID="createFakeConnectionBtn"
          style={{ marginRight: 11 }}
          onPress={createFakeConnection}
        >
          <Material name="dots-horizontal" size={32} color="#fff" />
        </TouchableOpacity>
      )
    : () => null,
  headerLeft: () => (
    <TouchableOpacity
      testID="connections-header-back"
      style={{
        marginLeft: DEVICE_IOS ? 20 : 10,
      }}
      onPress={() => {
        navigate('Home');
      }}
    >
      <SvgXml height="20" xml={backArrow} />
    </TouchableOpacity>
  ),
  headerTitle: () => {
    const { connections } = store.getState().connections;
    return connections.length ? (
      <View
        style={{
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <SearchConnections sortable={true} />
      </View>
    ) : null;
  },
};

const Connections = () => (
  <>
    <Stack.Screen
      name="Connections"
      component={ConnectionsScreen}
      options={connectionsScreenOptions}
    />
    <Stack.Screen
      name="SortingConnections"
      component={SortingConnectionsScreen}
      options={headerOptions}
    />
  </>
);

export default Connections;

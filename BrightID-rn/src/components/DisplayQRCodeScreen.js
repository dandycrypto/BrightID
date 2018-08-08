// @flow

import * as React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import qrcode from 'qrcode';
import { connect } from 'react-redux';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';
// import { generateMessage } from '../actions/exchange';
import logging from '../utils/logging';
import {
  createRTCId,
  update,
  OFFER,
  ALPHA,
  ICE_CANDIDATE,
  fetchArbiter,
} from '../actions/api';
import { resetWebrtc } from '../actions';
/**
 * Connection screen of BrightID
 */

type Props = {
  publicKey: Uint8Array,
  rtcId: string,
  dispatch: Function,
};

type State = {
  qrsvg: string,
};

class DisplayQRCodeScreen extends React.Component<Props, State> {
  static navigationOptions = {
    title: 'QR Code',
    headerRight: <View />,
  };

  constructor(props) {
    super(props);
    this.state = {
      qrsvgd: '',
      connecting: true,
    };
    // set up initial webrtc connection
    this.connection = null;
    this.channel = null;
    this.socket = null;
    this.pollingId = null;
  }

  async componentDidMount() {
    const { dispatch } = this.props;
    const rtcId = await dispatch(createRTCId());

    // generate qrcode with rtc id
    this.genQrCode();
    // initiate webrtc
    this.initiateWebrtc();
    // poll signalling server
    this.pollingId = setInterval(() => {
      dispatch(fetchArbiter());
    }, 1000);
  }

  async componentDidUpdate(prevProps) {
    // generate a new qrcode if the rtcId value changes
    const { arbiter } = this.props;

    // set remote description
    if (
      this.connection &&
      arbiter &&
      arbiter.ZETA.ANSWER &&
      (arbiter.ZETA.ANSWER.sdp !== prevProps.arbiter.ZETA.ANSWER.sdp ||
        arbiter.ZETA.ANSWER.type !== prevProps.arbiter.ZETA.ANSWER.type)
    ) {
      await this.connection.setRemoteDescription(
        new RTCSessionDescription(arbiter.ZETA.ANSWER),
      );
    }
    // set ice candidate
    if (
      this.connection &&
      arbiter &&
      arbiter.ZETA.ICE_CANDIDATE &&
      (arbiter.ZETA.ICE_CANDIDATE.candidate !==
        prevProps.arbiter.ZETA.ICE_CANDIDATE.candidate ||
        arbiter.ZETA.ICE_CANDIDATE.sdpMLineIndex !==
          prevProps.arbiter.ZETA.ICE_CANDIDATE.sdpMLineIndex ||
        arbiter.ZETA.ICE_CANDIDATE.sdpMid !==
          prevProps.arbiter.ZETA.ICE_CANDIDATE.sdpMid)
    ) {
      console.log('UserA:');
      console.log(arbiter.ZETA.ICE_CANDIDATE);
      await this.connection.addIceCandidate(
        new RTCIceCandidate(arbiter.ZETA.ICE_CANDIDATE),
      );
    }
  }

  componentWillUnmount() {
    const { dispatch } = this.props;
    // close and remove webrtc connection
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    // close data channel and remove
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    // disconnect and remove socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    // clear polling interval
    if (this.pollingId) {
      clearInterval(this.pollingId);
      this.pollingId = null;
    }

    dispatch(resetWebrtc());
  }

  initiateWebrtc = async () => {
    const { dispatch } = this.props;
    // create webrtc instance
    console.warn('creating w3ebrtc data channel');
    this.connection = new RTCPeerConnection(null);
    logging(this.connection, 'UserA');
    window.ca = this.connection;
    // handle ice
    this.connection.onicecandidate = this.updateIce;
    // create data channel
    this.channel = this.connection.createDataChannel('connect');
    // handle channel events
    this.updateChannel();
    // create offer and set local connection
    console.warn('creating offer');
    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);
    // update redux store
    await dispatch(update({ type: OFFER, person: ALPHA, value: offer }));
  };

  updateChannel = () => {
    if (this.channel) {
      this.channel.onopen = () => {
        console.warn('user A channel opened');
        this.setState({
          connecting: false,
        });
      };
      this.channel.onclose = () => {
        console.warn('user A channel closed');
      };
      this.channel.onmessage = (e) => {
        console.warn(`user A recieved message ${e.data}`);
        console.warn(e);
      };
    }
  };

  updateIce = async (e) => {
    try {
      const { dispatch } = this.props;
      if (e.candidate) {
        /**
         * update the signaling server dispatcher with ice candidate info
         * @param person = ZETA
         * @param type = ICE_CANDIDATE
         * @param value = e.candidate
         */

        dispatch(
          update({
            person: ALPHA,
            type: ICE_CANDIDATE,
            value: e.candidate,
          }),
        );
      }
    } catch (err) {
      console.warn(err);
    }
  };

  genQrCode = () => {
    const { rtcId } = this.props;
    if (rtcId) {
      qrcode.toString(rtcId, (err, data) => {
        if (err) throw err;
        this.parseSVG(data);
      });
    }
  };

  parseSVG = (qrsvg) => {
    // obtain the second path's d
    // use only what's inside the quotations
    const dinx = qrsvg.lastIndexOf('d');
    const dpath = qrsvg.substr(dinx);
    const qrsvgd = dpath.match(/"([^"]+)"/g)[0].split('"')[1];
    this.setState({ qrsvgd });
  };

  render() {
    return (
      <View style={styles.container}>
        <TextInput value={this.props.rtcId || 'RTC TOKEN'} editable={true} />
        <Svg height="150" width="150" viewBox="0 0 29 29">
          <Path fill="#fff" d="M0 0h29v29H0z" />
          <Path stroke="#000" d={this.state.qrsvgd} />
        </Svg>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfdfd',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
});

export default connect((state) => state.main)(DisplayQRCodeScreen);

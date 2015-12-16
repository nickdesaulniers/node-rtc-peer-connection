var config = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    }
  ],
};


var RTCPeerConnection = require('../lib/RTCPeerConnection');
var peer = new RTCPeerConnection(config);
peer.createDataChannel('hello');
peer.onnegotiationneeded = function () {
  console.log('negotiationneeded');
  peer.createOffer().then(function (offer) {
    return peer.setLocalDescription(offer);
  }).then(function () {
    console.log(peer.localDescription);
    console.log(peer.localDescription.sdp.split('\r\n'));
  }).catch(function (e) { console.error(e); });
};


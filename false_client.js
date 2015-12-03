var iceChar = require('./ice-ufrag-pwd');
var ipInfo = require('./ip_info');
var WebSocket = require('ws');
// TODO: move all logic w/ Packet to ./stun.js
var Packet = require('vs-stun/lib/Packet');
var SDP = require('./sdp');
var stun = require('./stun');

var mySdp = new SDP;
var theirSdp = null;

function stunReceived (err, info) {
  if (err) throw err;
  console.log('ipInfo', info);
  mySdp.setExternalAddr(info.external.addr);
  mySdp.setExternalPort(info.external.port);

  var ws = new WebSocket('ws://localhost:8081');
  ws.on('open', function () {
    ws.send(JSON.stringify({
      sdp: mySdp.toString(),
      type: 'offer',
    }));
    ws.send(JSON.stringify({
      candidate: info.getLocalString(),
    }));
    ws.send(JSON.stringify({
      candidate: info.getExternalString(),
    }));
  });

  ws.on('message', function (e) {
    var msg = JSON.parse(e);
    if (msg.type && msg.type === 'answer' && msg.sdp) {
      theirSdp = new SDP(msg.sdp);
    }
    console.log(msg);
  });
};

function printDebugPacket (p) {
  var type = Packet.getType(p);
  if (type === Packet.BINDING_SUCCESS) {
    //console.log(p);
    console.log();
  } else {
    console.log(Packet.typeToString(p));
    p.doc.attributes.forEach(function (attribute) {
      console.log(attribute.name, attribute.value.obj);
    });
    console.log();
  }
};

var udp = ipInfo(stunReceived);
udp.on('error', console.error.bind(console));
udp.on('message', function (msg, rinfo) {
  console.log('Received %d bytes from %s:%d',
    msg.length, rinfo.address, rinfo.port);
  var p = Packet.parse(msg);
  printDebugPacket(p);
  var type = Packet.getType(p);
  // If the signaling server has yet to send us their sdp info, drop binding
  // requests from the peer. TODO: find if the RFC says this explicitly.
  if (type === Packet.BINDING_REQUEST && theirSdp /* && weTrustThisIpFromSignallingServ */) {
    stun.respondToBindingRequest(udp, rinfo, p, theirSdp.getUserName(),
      mySdp.getPassword());
  }
  //console.log(Packet.typeToString(p));
  //console.log(p.doc.attribute);
  //console.log(p);
});


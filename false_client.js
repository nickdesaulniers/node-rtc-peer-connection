var iceChar = require('./ice-ufrag-pwd');
var ipInfo = require('./ip_info');
var WebSocket = require('ws');
var Packet = require('vs-stun/lib/Packet');
var stun = require('vs-stun');
var SDP = require('./sdp');

var sdp = new SDP;
var theirSdp = null;

function stunReceived (err, info) {
  if (err) throw err;
  console.log('ipInfo', info);
  sdp.setExternalAddr(info.external.addr);
  sdp.setExternalPort(info.external.port);

  var ws = new WebSocket('ws://localhost:8081');
  ws.on('open', function () {
    ws.send(JSON.stringify({
      sdp: sdp.toString(),
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
      // we've received their sdp
      // pull put their username/pw
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

// http://tools.ietf.org/html/rfc5389#section-10.1.2
function respondToBindingRequest (socket, rinfo, transactionId, username) {
  var packet = stun.create.bindingSuccess();
  Packet.setTransactionID(packet, transactionId);
  //packet.append.username(username);
  packet.append.messageIntegrity();
  //packet.append.fingerprint();
  socket.send(packet.raw, 0, packet.raw.length, rinfo.port, rinfo.address);
};

// http://tools.ietf.org/html/rfc5245 ICE
var udp = ipInfo(stunReceived);
udp.on('error', console.error.bind(console));
udp.on('message', function (msg, rinfo) {
  console.log('Received %d bytes from %s:%d',
    msg.length, rinfo.address, rinfo.port);
  var p = Packet.parse(msg);
  printDebugPacket(p);
  var type = Packet.getType(p);
  if (type === Packet.BINDING_REQUEST /* && weTrustThisIpFromSignallingServ */) {
    respondToBindingRequest(udp, rinfo, Packet.getTransactionID(p),
      p.doc.attribute.username);
  }
  //console.log(Packet.typeToString(p));
  //console.log(p.doc.attribute);
  //console.log(p);
});


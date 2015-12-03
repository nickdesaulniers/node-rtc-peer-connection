var vsStun = require('vs-stun');
var Packet = require('vs-stun/lib/Packet');

function setAddressMappings (packet, addr, port) {
  var info = {
    host: addr,
    port: port,
  };
  packet.append.mappedAddress(info);
  packet.append.xorMappedAddress(info);
};

// http://tools.ietf.org/html/rfc5389#section-10.1.2
function respondToBindingRequest (socket, destRInfo, requestPacket, username, mySdp) {
  console.log('responding to bind request with U: %s, P: %s\n', username,
    mySdp.getPassword());
  var responsePacket = vsStun.create.bindingSuccess({
    username: username, // the shared username
    password: mySdp.getPassword(), // my password
  });
  var transactionID = Packet.getTransactionID(requestPacket);
  Packet.setTransactionID(responsePacket, transactionID);

  setAddressMappings(responsePacket, mySdp.getExternalAddr(),
    mySdp.getExternalPort());

  responsePacket.append.messageIntegrity();
  socket.send(responsePacket.raw, 0, responsePacket.raw.length, destRInfo.port,
    destRInfo.address);
};

module.exports = {
  respondToBindingRequest: respondToBindingRequest,
};

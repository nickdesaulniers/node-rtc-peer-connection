var vsStun = require('vs-stun');
var Packet = require('vs-stun/lib/Packet');

// http://tools.ietf.org/html/rfc5389#section-10.1.2
function respondToBindingRequest (socket, destRInfo, requestPacket) {
  var responsePacket = vsStun.create.bindingSuccess({
    username: '',
    password: '',
  });
  var transactionID = Packet.getTransactionID(requestPacket);
  Packet.setTransactionID(responsePacket, transactionID);
  responsePacket.append.messageIntegrity();
  socket.send(responsePacket.raw, 0, responsePacket.raw.length, destRInfo.port,
    destRInfo.address);
};

module.exports = {
  respondToBindingRequest: respondToBindingRequest,
};

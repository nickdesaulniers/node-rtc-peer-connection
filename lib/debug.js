var chalk = require('chalk');
var Packet = require('vs-stun/lib/Packet');

function printDebugPacket (p, rinfo) {
  var type = Packet.getType(p);
  var str = '';
  if (type === Packet.BINDING_SUCCESS) {
    str += chalk.green('[STUN] BINDING SUCCESS ');
  } else if (type === Packet.BINDING_REQUEST) {
    str += chalk.yellow('[STUN] BINDING REQUEST ');
  } else {
    console.log(Packet.typeToString(p));
    p.doc.attributes.forEach(function (attr) {
      console.log(attr.name, attr.value.obj);
    });
    console.log();
  }
  str += chalk.blue(rinfo.address) + ':' + chalk.magenta(rinfo.port);
  console.log(str);
};

module.exports = {
  printDebugPacket: printDebugPacket,
};


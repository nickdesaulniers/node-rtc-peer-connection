var chalk = require('chalk');
var Packet = require('vs-stun/lib/Packet');

var leftArrow = '\u2190';
var rightArrow = '\u2192';

function printDebugPacket (p, rinfo) {
  var type = Packet.getType(p);
  var str = '';
  if (type === Packet.BINDING_SUCCESS) {
    str += chalk.green('[STUN] BINDING SUCCESS ');
  } else if (type === Packet.BINDING_REQUEST) {
    //console.log();
    str += chalk.yellow('[STUN] BINDING REQUEST ');
    //p.doc.attributes.forEach(function (attr) {
      //console.log(attr.name, attr.value.obj);
    //});
  } else {
    console.log();
    console.log(Packet.typeToString(p));
    p.doc.attributes.forEach(function (attr) {
      console.log(attr.name, attr.value.obj);
    });
  }
  str += chalk.blue(rinfo.address) + ':' + chalk.magenta(rinfo.port);
  console.log(str);
};

module.exports = {
  printDebugPacket: printDebugPacket,
};


var chalk = require('chalk');
var Packet = require('vs-stun/lib/Packet');

//var leftArrow = '\u2190';
//var rightArrow = '\u2192';

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

function printMatches (a, b) {
  console.log(chalk[a === b ? 'green' : 'red'](a + ' === ' + b));
  //console.log(typeof a, typeof b)
};

function printPeerReflexive (source, dest, candidatePair) {
  console.log('---');
  printMatches(source.address, candidatePair.remote.ip);
  printMatches(source.port, candidatePair.remote.port);
  printMatches(dest.host, candidatePair.local.ip);
  printMatches(dest.port, candidatePair.local.port);
  console.log('---');
};

function formatAddrPort (obj) {
  return chalk.blue(obj.ip) + ':' + chalk.magenta(obj.port);
};

function printPairs (pairList) {
  console.log('local -> remote');
  pairList.forEach(function (pair) {
    console.log(formatAddrPort(pair.local) + ' -> ' + formatAddrPort(pair.remote));
  });
  console.log('---');
};

module.exports = {
  printDebugPacket: printDebugPacket,
  printPeerReflexive: printPeerReflexive,
  printPairs: printPairs,
};


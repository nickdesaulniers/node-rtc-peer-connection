var EventTarget = require('event-target-shim');
var util = require('util');
// https://w3c.github.io/webrtc-pc/#rtcdatachannel

function RTCDataChannel () {
  EventTarget.call(this);

  // https://w3c.github.io/webrtc-pc/#idl-def-RTCDataChannel
  this.label = null;
  this.negotiated = false;
  this.protocol = '';
  this.maxPacketLifeTime = null;
  this.maxRetransmitts = null;
  this.readyState = 'connecting';
  this.ordered = null;
  this.id = null;
  this.bufferedAmount = 0;
  //this attribute is not readonly
  this.bufferedAmountLowThreshold = 0;

};

var emittedEvents = [
  'open',
  'bufferedamountlow',
  'error',
  'close'
];

util.inherits(RTCDataChannel, EventTarget(emittedEvents));

RTCDataChannel.prototype.send = function (data) {
  //https://w3c.github.io/webrtc-pc/#dom-datachannel-send
  //TODO:Step 1 implies this?
  //Step 2
  if (this.readyState === 'connecting') {
    throw new Error('InvalidStateError');
  }
  //TODO:Does this work in all browsers and node?
  //Step 3
  if (typeof data === "string" || data instanceof String) {
    //TODO:increment this.bufferedAmount by length of string in UTF-8
    //TODO: send String
  } else if (data instanceof Blob) {
    this.bufferedAmount += data.size;
    //TODO: send Blob
  } else if (data instanceof ArrayBuffer) {
    this.bufferedAmount += data.byteLength;
    //TODO:Does isView work in all browsers and node?
    if (ArrayBuffer.isView(data)) {
      //TODO: send ArrayBufferView
    } else {
      //TODO: send ArrayBuffer
    }
  } else {
    //TODO: need to handle bad datatype
  }
  //TODO:Step 4
  //TODO:Step 5
};

RTCDataChannel.prototype.close = function () {
  //https://w3c.github.io/webrtc-pc/#widl-RTCDataChannel-close-void
  //TODO: Is 'this' not the RTCDataChannel Step 1
  //Step 2
  if (this.readyState === 'closing' || this.readyState === 'closed') {
    return;
  }
  //Step 3
  this.readyState = 'closing';
  //TODO: Step 4
};

module.exports = RTCDataChannel;

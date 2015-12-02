var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 8081 });

wss.on('connection', function (ws) {
  ws.on('message', function (message) {
    wss.clients.forEach(function (client) {
      if (client !== ws) {
        client.send(message);
      }
    });
    console.log('received: %s', message);
  });
});

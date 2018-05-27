var Hapi = require("hapi");
var releases = require("./releases.js");

const init = async() => {

  const server = new Hapi.Server({
    host: '::',
    port: 3000
  })

  server.route({
    method: 'GET',
    path: '/api/v1/releases',
    handler: releases.list
  });
  server.route({
    method: 'GET',
    path: '/api/v1/releases/{id}',
    options: {
      handler: releases.get
    }
  });

  server.route({
    method: 'POST',
    path: '/api/v1/releases',
    handler: releases.create
  });

  server.route({
    method: 'PUT',
    path: '/api/v1/releases/{id}',
    handler: releases.update
  });

  server.route({
    method: 'DELETE',
    path: '/api/v1/releases/{id}',
    handler: releases.remove
  });


  await server.start()
  return server;
}

init().then(server => {
  console.log('Server running at:', server.info.uri);
}).catch(err => {
  console.log(err);
});

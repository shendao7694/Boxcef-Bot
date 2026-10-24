const serve = require('./core/serve');
const manager = require('./manager/server/main');
const database = require('./core/database');

database.initSys();
serve.connect();
manager.start();
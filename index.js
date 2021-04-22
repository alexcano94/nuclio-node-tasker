const http = require('http');

const finalHandler = require('finalhandler');
const Router = require('router');
const low = require('lowdb')

const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ tasks: [], logs: [] }).write();

const router = Router();

router.use((req, res, next) => {
    let body = [];
    req.on('data', (chunk) => {
        body.push(chunk);
    }).on('end', () => {
        body = Buffer.concat(body).toString();
        if( body ){
            req.body = JSON.parse(body);
        }
        next();
    });
});

router.post('/task', (req, res) => {
    const { data } = req.body;
    db.get('tasks').push(data).write();
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(`{ "message": "Task ${data.id} was created "}`);
});

router.get('/task', (req, res) => {
    const tasks = db.get('tasks').value();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tasks));
});

router.get('/task/:id', (req, res) => {
    const { id } = req.params;
    const tasks = db.get('tasks').value();
    const task = tasks.filter((task) => task.id === parseInt(id));
    if(task.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(`{ "message": "Task with id: ${id} was not found "}`);
    } 
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(task[0]));
});

const server = http.createServer((req, res) => {
    router(req, res, finalHandler(req, res));
});

server.listen(3001, 'localhost', () => {
    console.log('Server is running');
});
 
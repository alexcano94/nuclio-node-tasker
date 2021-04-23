const http = require('http');
const Ajv = require("ajv");
const ajv = new Ajv();

const finalHandler = require('finalhandler');
const Router = require('router');
const low = require('lowdb')

const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ tasks: {}, logs: [] }).write();

const router = Router();


const entityExists = (entity, id, res) => {
    const task = db.get(entity)
    .find({ id: parseInt(id) })
    .value();
    if(!task) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(`{ "message": "${entity} with id ${id} was not found "}`);
    }
    return task;
};


const checkEntity = (entity, id) => {
    const task = db.get(entity)
    .find({ id: parseInt(id) })
    .value();
    return !!task;
};


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


const taskCreateSchema = {
    type: "object",
    properties: {
      id: {type: "number"},
      title: {type: "string"},
      completed: {type: "boolean"},
    },
    required: ["id", "title", "completed"],
    additionalProperties: false
};

const taskUpdateSchema = {
    type: "object",
    properties: {
      title: {type: "string"},
      completed: {type: "boolean"},
    },
    required: ["title", "completed"],
    additionalProperties: false
};


const taskPatchSchema = {
    type: "object",
    properties: {
      title: {type: "string"},
      completed: {type: "boolean"},
    },
    required: [],
    additionalProperties: false
};

const validateTask = (schema, data, res) => {
    const valid = ajv.validate(schema, data);
    if (!valid){
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(`{ "message": "Incorrect task schema"}`);
    }
    return valid;
}

router.post('/task', (req, res) => {
    const { data } = req.body;
    let valid = validateTask(taskCreateSchema, data, res);
    if (valid) {
        const task = checkEntity('tasks', data.id);
        if (task) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(`{ "message": "Task with id: ${data.id} already exists"}`);
            return;
        }
        db.get('tasks').push(data).write();
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(`{ "message": "Task ${data.id} was created "}`);
    }

});

router.patch('/task/:id', (req, res) => {
    const { id } = req.params;
    const { data } = req.body;
    
    entityExists('tasks', id, res);
    validateTask(taskPatchSchema, data, res);

    db.get('tasks')
    .find({ id: parseInt(id) })
    .assign(data)
    .write()
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(`{ "message": "Task ${id} was updated "}`);
});

router.put('/task/:id', (req, res) => {
    const { id } = req.params;
    const { data } = req.body;

    entityExists('tasks', id, res);
    validateTask(taskUpdateSchema, data, res);
    

    db.get('tasks')
    .find({ id: parseInt(id) })
    .assign(data)
    .write();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(`{ "message": "Task ${id} was updated "}`);
}); 

router.delete('/task/:id', (req, res) => {
    const { id } = req.params;
    entityExists('tasks', id, res);
    db.get('tasks')
    .remove({ id: parseInt(id) })
    .write();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(`{ "message": "Task ${id} was deleted "}`);
})

router.get('/task', (req, res) => {
    const tasks = db.get('tasks').value();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tasks));
});

router.get('/task/:id', (req, res) => {
    const { id } = req.params;
    const task = entityExists('tasks', id, res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(task));
});

const server = http.createServer((req, res) => {
    router(req, res, finalHandler(req, res));
});

server.listen(3001, 'localhost', () => {
    console.log('Server is running');
});
 
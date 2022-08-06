const express = require('express')
const mongoose = require('mongoose')
const Schema = mongoose.Schema
const expressServer = express()
expressServer.use(express.static(__dirname + '/app'))
expressServer.get('/', function (request, response) {
  response.sendFile(__dirname + '/app/index.html')
})
const JSONParser = express.json({ type: 'application/json' })

mongoose.connect(
  //atlas mongodb
  'mongodb+srv://user12345:12345@cluster1.mgmwwie.mongodb.net',
  //'mongodb://localhost:27017/tasksdb',
  {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  },
  (err) => {
    if (err) return console.log(err)
    else if (mongoose.connection.readyState === 1)
      console.log('Mongoose connection established')
    expressServer.listen(process.env.PORT || 3000, function () {
      console.log(`The server is up at PORT ${process.env.PORT || 3000}`)
    })
  }
)

const tasksScheme = new Schema({
  column: Number,
  row: Number,
  text: String,
  color: { type: String, default: '#ffffff' },
})
const Task = mongoose.model('Task', tasksScheme)

const tasksTypeScheme = new Schema({
  column: Number,
  text: { type: String, default: 'Enter task type' },
})
const TaskType = mongoose.model('TaskType', tasksTypeScheme)

expressServer.post('/tasks', JSONParser, async (request, response) => {
  let newTask = new Task(request.body)
  await newTask
    .save()
    .then(() => {
      console.log(`Created task "${newTask._id}"`)
      response.send(`Server: created task "${newTask._id}"`)
    })
    .catch((err) => {
      if (err) return console.log(err)
    })
})

expressServer.post('/tasktypes', JSONParser, async (request, response) => {
  let newTaskType = new TaskType(request.body)
  await newTaskType
    .save()
    .then(() => {
      console.log(`Created task type "${newTaskType._id}"`)
      response.send(`Server: created task type "${newTaskType._id}"`)
    })
    .catch((err) => {
      if (err) return console.log(err)
    })
})

expressServer.put('/tasks', JSONParser, async (request, response) => {
  await Task.findByIdAndUpdate(request.headers.id.replace(/['"]+/g, ''), {
    column: request.body.column,
    row: request.body.row,
    text: request.body.text,
    color: request.body.color,
  })
    .then(() => {
      console.log(`Updated task "${request.headers.id}"`)
      response.send(`Server: updated task "${request.headers.id}"`)
    })
    .catch((err) => {
      if (err) return console.log(err)
    })
})

expressServer.put('/tasktypes', JSONParser, async (request, response) => {
  await TaskType.findByIdAndUpdate(request.headers.id.replace(/['"]+/g, ''), {
    column: request.body.column,
    text: request.body.text,
  })
    .then(() => {
      console.log(`Updated task type "${request.headers.id}"`)
      response.send(`Server: updated task type "${request.headers.id}"`)
    })
    .catch((err) => {
      if (err) return console.log(err)
    })
})

expressServer.delete('/tasks', (request, response) => {
  Task.findByIdAndDelete(request.headers.id.replace(/['"]+/g, ''))
    .then(() => {
      console.log(`Deleted task "${request.headers.id}"`)
      response.send(`Server: deleted task "${request.headers.id}"`)
    })
    .catch((err) => {
      if (err) return console.log(err)
    })
})

expressServer.delete('/tasktypes', (request, response) => {
  TaskType.findByIdAndDelete(request.headers.id.replace(/['"]+/g, ''))
    .then(() => {
      console.log(`Deleted task type "${request.headers.id}"`)
      response.send(`Server: deleted task type "${request.headers.id}"`)
    })
    .catch((err) => {
      if (err) return console.log(err)
    })
})

expressServer.get('/tasks', (request, response) => {
  Task.find({}, function (err, tasks) {
    if (err) console.log(err)
    response.send(tasks)
  })
})

expressServer.get('/tasktypes', (request, response) => {
  TaskType.find({}, function (err, taskTypes) {
    if (err) console.log(err)
    response.send(taskTypes)
  })
})

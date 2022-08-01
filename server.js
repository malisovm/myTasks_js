// basic setup

const express = require('express')
const mongoose = require('mongoose')
const expressServer = express()
expressServer.use(express.static(__dirname + '/app'))
expressServer.get('/', function (request, response) {
  response.sendFile(__dirname + '/app/index.html')
})
const JSONParser = express.json({ type: 'application/json' })
expressServer.listen(3000)

// mongodb connection via mongoose and setting up the task scheme

const Schema = mongoose.Schema
const tasksScheme = new Schema({
  column: Number,
  row: Number,
  text: String,
})
mongoose.connect('mongodb://localhost:27017/tasksdb', {
  useUnifiedTopology: true,
  useNewUrlParser: true,
})
const Task = mongoose.model('Task', tasksScheme)

//getting tasks from the app and adding them to mongodb

expressServer.post('/', JSONParser, async (request, response) => {
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

expressServer.put('/', JSONParser, async (request, response) => {
  await Task.findByIdAndUpdate(request.headers.id.replace(/['"]+/g, ''), {
    column: request.body.column,
    row: request.body.row,
    text: request.body.text,
  })
    .then(() => {
      console.log(`Updated task ${request.headers.id}`)
      response.send(`Server: updated task ${request.headers.id}`)
    })
    .catch((err) => {
      if (err) return console.log(err)
    })
})

expressServer.delete('/', (request, response) => {
  Task.findByIdAndDelete(request.headers.id.replace(/['"]+/g, ''))
  .then(() => {
    console.log(`Deleted task ${request.headers.id}`)
    response.send(`Server: deleted task ${request.headers.id}`)
  })
  .catch((err) => {
    if (err) return console.log(err)
  })
})
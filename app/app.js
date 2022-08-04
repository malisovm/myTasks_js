//serverWorkers enable PWA functionality
window.addEventListener('load', async () => {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('serviceworkers.js')
      console.log('ServiceWorker registered', reg)
    } catch (err) {
      console.log('ServiceWorker registration error', err)
    }
  }
})

//auxiliary stuff to simplify the rest of the code
HTMLCollection.prototype.forEach = Array.prototype.forEach
taskGrid = () => {
  console.log(document.querySelector('#task-grid'))
}
const columns = document.querySelector('#task-grid').children
function column(col) {
  return columns[col - 1]
}
function taskField(col, task) {
  return columns[col - 1].children[task]
}
function taskText(col, task, text) {
  if (!text) return columns[col - 1].children[task].children[0].value
  else columns[col - 1].children[task].children[0].value = text
}

/*a taskField as a custom stylable html element that contains a <textarea> that interacts with mongodb on backend
 * focus() functions ensure that new tasks get focus, so that when they lose it ("onblur" event) a new db entry is created or updated */

class TaskField extends HTMLElement {
  constructor() {
    super()
    let textarea = document.createElement('textarea')
    textarea.spellcheck = false
    textarea.oninput = () => {
      // making the size of the text-field auto-fit the length of the text
      textarea.style.height = '1px'
      textarea.style.height = textarea.scrollHeight + 'px'
    }
    textarea.onblur = async () => {
      let taskInfo = {
        column: this.className.match(/\d+/)[0],
        row: [...this.parentElement.children].indexOf(this),
        text: textarea.value,
      }
      // for new tasks
      if (!this.id) {
        await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskInfo),
        })
          .then((response) => response.text())
          .then((responseText) => {
            this.id = responseText.split('"')[1]
            console.log(responseText)
          })
      }
      // for tasks with existing id in mongodb
      else if (this.id) {
        await fetch('/', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', id: this.id },
          body: JSON.stringify(taskInfo),
        })
          .then((response) => response.text())
          .then((responseText) => console.log(responseText))
      }
    }
    this.appendChild(textarea)
  }
}
customElements.define('task-field', TaskField)

class TaskType extends HTMLInputElement {
  constructor() {
    super()
    this.onblur = async () => {
      let taskTypeInfo = {
        column: this.parentElement.id.match(/\d+/)[0],
        text: this.value,
      }
      if (!this.id) {
        await fetch('/tasktype', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskTypeInfo),
        })
          .then((response) => response.text())
          .then((responseText) => {
            this.id = responseText.split('"')[1]
            console.log(responseText)
          })
      }
      // for tasks with existing id in mongodb
      else if (this.id) {
        await fetch('/tasktype', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', id: this.id },
          body: JSON.stringify(taskTypeInfo),
        })
          .then((response) => response.text())
          .then((responseText) => console.log(responseText))
      }
    }
  }
}
customElements.define('task-type', TaskType, { extends: 'input' })

function addTask(column, fromSaved) {
  let columnArr = document.querySelector(`#${column}`).children
  let columnLastElement = columnArr[columnArr.length - 1]
  let newTask = `<task-field class="${column}"></task-field>`
  columnLastElement.insertAdjacentHTML('beforebegin', newTask)
  if (!fromSaved) {
    columnArr[columnArr.length - 2].lastChild.focus()
  }
}

var numOfCols = 2
function addColumn(lastColNum) {
  let newColumn = `<div class="column" id="column${lastColNum}" style="grid-column: ${lastColNum}">
  <input is="task-type" value="Enter task type" onfocus="this.value=''">
  <button class="add" onclick="addTask('column${lastColNum}')">+ Add task</button>
  </div>
  <div class="column" id="column${lastColNum + 1}" style="grid-column: ${
    lastColNum + 1
  }">
  <button class="add" onclick="addColumnAndTask()">+ Add task type</button>
  </div>`
  let lastColumn = columns[lastColNum - 1]
  lastColumn.insertAdjacentHTML('beforebegin', newColumn)
  lastColumn.remove()
  numOfCols++
  let columnArr = document.querySelector(`#column${lastColNum}`).children
}

function addColumnAndTask() {
  addColumn(numOfCols)
  addTask(`column${numOfCols - 1}`)
}

const removeTaskFromDB = async (taskId) => {
  await fetch('/', {
    method: 'DELETE',
    headers: { id: taskId },
  })
    .then((response) => response.text())
    .then((responseText) => console.log(responseText))
}

const removeTaskTypeFromDB = async (taskTypeId) => {
  await fetch('/tasktype', {
    method: 'DELETE',
    headers: { id: taskTypeId },
  })
    .then((response) => response.text())
    .then((responseText) => console.log(responseText))
}

const removeTask = async (event) => {
  switch (event.target.nodeName) {
    case 'TASK-FIELD':
      event.preventDefault()
      let thisColTasks = event.target.parentElement.children
      removeTaskFromDB(event.target.id)
      event.target.remove()
      //and to change row numbers of the remaining tasks in this column:
      thisColTasks.forEach(async (taskToUpdateRow) => {
        if (
          taskToUpdateRow.nodeName === 'TASK-FIELD' &&
          taskToUpdateRow.id !== event.target.id
        ) {
          await fetch('/', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              id: taskToUpdateRow.id,
            },
            body: JSON.stringify({
              row: [...thisColTasks].indexOf(taskToUpdateRow),
            }),
          })
            .then((response) => response.text())
            .then((responseText) => console.log(responseText))
        }
      })
      break

    case 'INPUT': // removes a column
      event.preventDefault()
      numOfCols--
      document
        .querySelector(`#${event.path[1].id}`)
        .children.forEach((taskToRemove) => {
          if (taskToRemove.nodeName === 'TASK-FIELD') {
            removeTaskFromDB(taskToRemove.id)
          }
          if (taskToRemove instanceof TaskType) {
            removeTaskTypeFromDB(taskToRemove.id)
          }
        })
      document.querySelector(`#${event.path[1].id}`).remove() // removing the actual column in UI
      // changing the html parameters of the remaining columns to fit the new order:
      columns.forEach((col) => {
        let colNum = [...columns].indexOf(col) + 1
        col.id = `column${colNum}`
        col.style = `grid-column: ${colNum}`
        // the last col would be "add task type" button, so:
        if (col !== columns[columns.length - 1]) {
          // changing the 'add task' buttons
          col.children[
            col.children.length - 1
          ].outerHTML = `<button class="add" onclick="addTask('column${colNum}')">+ Add task</button>`
          // changing tasks
          col.children.forEach(async (taskToUpdateColumn) => {
            if (
              taskToUpdateColumn !== col.children[0] &&
              taskToUpdateColumn !== col.children[col.children.length - 1]
            ) {
              taskToUpdateColumn.className = `column${colNum}`
              await fetch('/', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  id: taskToUpdateColumn.id,
                },
                body: JSON.stringify({
                  column: colNum,
                }),
              })
            } else if (taskToUpdateColumn == col.children[0]) {
              await fetch('/tasktype', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  id: taskToUpdateColumn.id,
                },
                body: JSON.stringify({ column: colNum }),
              })
            }
          })
        }
      })
  }
}
document.body.addEventListener('contextmenu', removeTask, true) // contextmenu == rightclick or long tap on mobile

window.onload = async () => {
  let savedTasks = await fetch('/db', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((response) => response.text())
    .then((responseText) => JSON.parse(responseText))
  if (savedTasks.length === 0) {
    addTask(`column1`)
    taskField(1, 1).lastChild.focus()
  }
  console.log('Server: found saved tasks\n', savedTasks)
  let savedColumns = []
  savedTasks.forEach((savedTask) => {
    savedColumns.push(savedTask.column)
  })
  let numOfSavedCols = Math.max(...savedColumns)
  for (i = 1; i < numOfSavedCols; i++) {
    addColumn(i + 1)
  }
  savedTasks.forEach((savedTask) => {
    addTask(`column${savedTask.column}`, true)
    let thisTask = taskField(savedTask.column, savedTask.row)
    thisTask.id = savedTask._id
    thisTask.lastChild.value = savedTask.text
    thisTask.lastChild.style.height = '1px'
    thisTask.lastChild.style.height = thisTask.lastChild.scrollHeight + 'px'
  })
  // THIS SHOULD BE TASK TYPES:
  let savedTaskTypes = await fetch('/tasktype', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((response) => response.text())
    .then((responseText) => JSON.parse(responseText))
  console.log('Server: found saved task types\n', savedTaskTypes)
  savedTaskTypes.forEach((savedTaskType) => {
    column(savedTaskType.column).children[0].id = savedTaskType._id
    column(savedTaskType.column).children[0].value = savedTaskType.text
  })
}

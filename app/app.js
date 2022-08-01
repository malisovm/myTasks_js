//This enables the ServiceWorker functionality, so the app can function as a PWA
window.addEventListener('load', async () => {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('serviceworkers.js')
      console.log('ServiceWorker register success', reg)
    } catch (e) {
      console.log('ServiceWorker register fail')
    }
  }
})

//Some functions to simplify working with the code below
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

//Defining the functionality of a task field
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
    // upon change, this sends a task with its info to backend
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
      else {
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

//This function adds a new task to a column
function addTask(column) {
  let columnArr = document.querySelector(`#${column}`).children
  let columnLastElement = columnArr[columnArr.length - 1]
  let newTask = `<task-field class="${column}"></task-field>`
  columnLastElement.insertAdjacentHTML('beforebegin', newTask)
  columnArr[columnArr.length - 2].lastChild.focus() // this ensures that a new db entry is created for an empty task
}

//This function adds a new column
var numOfCols = 2
function addTaskType(lastColNum) {
  let newColumn = `<div class="column" id="column${lastColNum}" style="grid-column: ${lastColNum}">
  <input value="Enter task type" onfocus="this.value=''">
  <task-field class="column${lastColNum}"></task-field>
  <button class="add" onclick="addTask('column${lastColNum}')">+ Add task</button>
  </div>
  <div class="column" id="column${lastColNum + 1}" style="grid-column: ${
    lastColNum + 1
  }">
  <button class="add" onclick="addTaskType(numOfCols)">+ Add task type</button>
  </div>`
  let lastColumn = columns[lastColNum - 1]
  lastColumn.insertAdjacentHTML('beforebegin', newColumn)
  lastColumn.remove()
  numOfCols++
  let columnArr = document.querySelector(`#column${lastColNum}`).children
  columnArr[columnArr.length - 2].lastChild.focus() // this ensures that a new db entry is created for the first task
}

//This function removes various elements on a right click (or long tap on mobile)
const removeTaskFromDB = async (taskId) => {
  await fetch('/', {
    method: 'DELETE',
    headers: { id: taskId },
  })
    .then((response) => response.text())
    .then((responseText) => console.log(responseText))
}

const removeTask = (event) => {
  switch (event.target.nodeName) {
    case 'TASK-FIELD':
      event.target.remove()
      event.preventDefault()
      if (event.target.id) {
        removeTaskFromDB(event.target.id)
      }
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
        })
      document.querySelector(`#${event.path[1].id}`).remove() // removing the actual column
      // changing the html parameters of the remaining columns to fit the new order:
      columns.forEach((col) => {
        let colNum = [...columns].indexOf(col) + 1
        col.id = `column${colNum}`
        col.style = `grid-column: ${colNum}`
        if (col !== columns[columns.length - 1]) {
          // changing the 'add task' buttons
          col.children[
            col.children.length - 1
          ].outerHTML = `<button class="add" onclick="addTask('column${colNum}')">+ Add task</button>`
          // changing tasks
          col.children.forEach((task) => {
            if (
              task !== col.children[0] &&
              task !== col.children[col.children.length - 1]
            ) {
              task.className = `column${colNum}`
            }
          })
        }
      })
  }
}
document.body.addEventListener('contextmenu', removeTask, true)

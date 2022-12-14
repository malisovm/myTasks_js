HTMLCollection.prototype.forEach = Array.prototype.forEach
const body = document.querySelector('body')
var taskGrid = document.querySelector('#task-grid')
var columns = document.querySelector('#task-grid').children
var contextMenu = document.querySelector('#context-menu')
var myTasksLogo = document.querySelector('#myTasksLogo')
var darkenLayer = document.querySelector('#darkenLayer')
var dragged
function insertAfter(newNode, existingNode) {
  existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling)
}
function insertBefore(newNode, existingNode) {
  existingNode.parentNode.insertBefore(newNode, existingNode)
}
function rgba2hex(rgba) {
  return `#${rgba
    .match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+\.{0,1}\d*))?\)$/)
    .slice(1)
    .map((n, i) =>
      (i === 3 ? Math.round(parseFloat(n) * 255) : parseFloat(n))
        .toString(16)
        .padStart(2, '0')
        .replace('NaN', '')
    )
    .join('')}`
}
const bodyColor = rgba2hex(window.getComputedStyle(body).backgroundColor)

function column(col) {
  return columns[col - 1]
}
function taskField(col, task) {
  return columns[col - 1].children[task]
}
function getColNum(elem) {
  return parseInt(elem.parentElement.id.match(/\d+/)[0])
}
function getRowNum(elem) {
  return [...elem.parentElement.children].indexOf(elem)
}

/*a taskField is a custom stylable html element that contains a <div> that turns into a <textarea> upon click. This textarea that interacts with mongodb on backend
a taskType is a renamable header at the top of each column
 * click() functions ensure that new tasks get a <textarea>, so that when they lose focus ("onblur" event) a new db entry is created or updated */

class TaskField extends HTMLElement {
  constructor() {
    super()

    this.draggable = 'true'
    this.droppable = 'true'
    this.ondrop = async () => {
      moveTask
    }

    if (this.style.backgroundColor) {
      document.querySelector('#changeColorInput').value = rgba2hex(
        this.style.backgroundColor
      )
    } else {
      document.querySelector('#changeColorInput').value = '#ffffff'
    }

    let textDiv = document.createElement('div')
    textDiv.droppable = 'true'
    let textarea
    this.appendChild(textDiv)
    textDiv.style.backgroundColor = this.style.backgroundColor
    textDiv.classList.add('textDiv')
    textDiv.onclick = () => {
      textarea = document.createElement('textarea')
      textarea.spellcheck = false
      textarea.value = textDiv.innerHTML
      textDiv.replaceWith(textarea)

      textarea.oninput = () => {
        textarea.style.height = '1px'
        textarea.style.height = textarea.scrollHeight + 'px'
      }

      textarea.onfocus = async () => {
        textarea.style.height = textarea.scrollHeight + 'px'
        darkenLayer.style.display = 'block'
        this.style.zIndex = '2'
        textarea.style.backgroundColor = this.style.backgroundColor
        contextMenu.style.display = 'block'
        contextMenu.taskId = this.id
        contextMenu.style.left = `${this.getBoundingClientRect().x + 217}px`
        contextMenu.style.top = `${this.getBoundingClientRect().y}px`

        if (!this.id) {
          await fetch('/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              column: getColNum(this),
              row: getRowNum(this),
            }),
          })
            .then((response) => response.text())
            .then((responseText) => {
              this.id = responseText.split('"')[1]
              console.log(responseText)
            })
        }
      }

      textarea.onblur = async () => {
        darkenLayer.style.display = 'none'
        this.style.zIndex = ''
        if (this.id) {
          await fetch('/tasks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', id: this.id },
            body: JSON.stringify({ text: textarea.value }),
          })
            .then((response) => response.text())
            .then((responseText) => console.log(responseText))
        }
        editEnd()
      }
      textarea.focus()
    }
    const editEnd = () => {
      textDiv.innerHTML = textarea.value
      textarea.replaceWith(textDiv)
    }
  }
}
customElements.define('task-field', TaskField)

class TaskType extends HTMLInputElement {
  constructor() {
    super()
    this.placeholder = 'Enter task type'
    this.onblur = async () => {
      if (this.value !== '') {
        if (this.id) {
          await fetch('/tasktypes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', id: this.id },
            body: JSON.stringify({ column: getColNum(this), text: this.value }),
          })
            .then((response) => response.text())
            .then((responseText) => console.log(responseText))
        }
      }
    }
  }
}
customElements.define('task-type', TaskType, { extends: 'input' })

function addTask(column, fromSaved = false) {
  let columnArr = document.querySelector(`#${column}`).children
  let columnLastElement = columnArr[columnArr.length - 1]
  let newTask = '<task-field></task-field>'
  columnLastElement.insertAdjacentHTML('beforebegin', newTask)
  if (!fromSaved) {
    columnArr[columnArr.length - 2].lastChild.click() // this triggers adding to db
  }
}

async function addColumn(fromSaved) {
  let newColumn = `<div class="column" id="column${
    columns.length
  }" style="grid-column: ${columns.length}">
  <input is="task-type" title="Right click to remove column" value="Enter task type" onfocus="this.value=''">
  <button class="add addTask" onclick="addTask('column${
    columns.length
  }')">+ Add task</button>
  </div>
  <div class="column" id="column${columns.length + 1}" style="grid-column: ${
    columns.length + 1
  }">
  <button class="add addTaskType" onclick="addColumnAndTask()" droppable="true">+ Add task type</button>
  </div>`
  let lastColumn = columns[columns.length - 1]
  lastColumn.insertAdjacentHTML('beforebegin', newColumn)
  lastColumn.remove()
  if (!fromSaved) {
    await fetch('/tasktypes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column: columns.length - 1 }),
    })
      .then((response) => response.text())
      .then((responseText) => {
        let newLastCol = columns[columns.length - 2]
        newLastCol.children[0].id = responseText.split('"')[1]
        console.log(responseText)
      })
  }
}

function addColumnAndTask() {
  addColumn()
  addTask(`column${columns.length - 1}`)
}

const removeFromDB = async (path, elementId) => {
  await fetch(path, {
    method: 'DELETE',
    headers: { id: elementId },
  })
    .then((response) => response.text())
    .then((responseText) => console.log(responseText))
}

const removeTask = document.querySelector('#removeTask') //button in context-menu
removeTask.onclick = async (event) => {
  let taskToRemove = document.getElementById(contextMenu.taskId)
  removeFromDB('/tasks', taskToRemove.id)
  let currentCol = taskToRemove.parentElement
  taskToRemove.remove()
  contextMenu.style.display = 'none'
  //and to change row numbers of the remaining tasks in this column:
  currentCol.children.forEach(async (taskToUpdateRow) => {
    if (
      taskToUpdateRow.nodeName === 'TASK-FIELD' &&
      taskToUpdateRow.id !== contextMenu.taskId
    ) {
      await fetch('/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          id: taskToUpdateRow.id,
        },
        body: JSON.stringify({
          row: [...currentCol.children].indexOf(taskToUpdateRow),
        }),
      })
        .then((response) => response.text())
        .then((responseText) => console.log(responseText))
    }
  })
}

const removeColumn = async (event) => {
  if (event.target.nodeName === 'INPUT') {
    event.preventDefault()
    document
      .querySelector(`#${event.path[1].id}`)
      .children.forEach((elemToRemove) => {
        if (elemToRemove.nodeName === 'TASK-FIELD') {
          removeFromDB('/tasks', elemToRemove.id)
        }
        if (elemToRemove instanceof TaskType) {
          removeFromDB('/tasktypes', elemToRemove.id)
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
        ].outerHTML = `<button class="add addTask" onclick="addTask('column${colNum}')">+ Add task</button>`
        // changing tasks
        col.children.forEach(async (taskToUpdateColumn) => {
          let PUTpath
          if (taskToUpdateColumn.nodeName === 'TASK-FIELD') PUTpath = '/tasks'
          else if (taskToUpdateColumn == col.children[0]) PUTpath = '/tasktypes'
          await fetch(PUTpath, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              id: taskToUpdateColumn.id,
            },
            body: JSON.stringify({ column: colNum }),
          })
        })
      }
    })
  }
}
document.body.addEventListener('contextmenu', removeColumn, true) // contextmenu == rightclick or long tap on mobile

window.onload = async () => {
  let savedTaskTypes = await fetch('/tasktypes', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((response) => response.text())
    .then((responseText) => JSON.parse(responseText))

  let savedTasks = await fetch('/tasks', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((response) => response.text())
    .then((responseText) => JSON.parse(responseText))

  let savedBodyColor = await fetch('/globals', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      id: 'bodyColor',
    },
  })
    .then((response) => response.text())
    .then((responseText) => JSON.parse(responseText))
  body.style.backgroundColor = savedBodyColor.value
  changeBodyColorDiv.lastChild.value = savedBodyColor.value

  if (savedTaskTypes.length !== 0) {
    console.log('Server: found saved task types\n', savedTaskTypes)
    for (let i = 0; i < savedTaskTypes.length; i++) {
      addColumn(true)
    }

    savedTaskTypes.forEach((savedTaskType) => {
      column(savedTaskType.column).children[0].id = savedTaskType._id
      column(savedTaskType.column).children[0].value = savedTaskType.text
    })

    if (savedTasks.length !== 0) {
      console.log('Server: found saved tasks\n', savedTasks)
      savedTasks.forEach((savedTask) => {
        addTask(`column${savedTask.column}`, true) // savedTasks is out-of-order row-wise, so creating black task-fields first, then filling them in a separate forEach
      })
      savedTasks.forEach((savedTask) => {
        let thisTask = taskField(savedTask.column, savedTask.row)
        thisTask.id = savedTask._id
        thisTask.lastChild.innerHTML = savedTask.text
        thisTask.style.backgroundColor = savedTask.color
      })
    } else if (savedTasks.length === 0) {
      addTask('column1')
    }
  } else if (savedTaskTypes.length === 0) {
    addColumnAndTask()
    taskField(1, 1).lastChild.click()
  }
}

document.body.addEventListener('click', (event) => {
  if (
    !event.target.classList.contains('item') &&
    !event.target.classList.contains('textDiv') &&
    !event.target.classList.contains('add')
  ) {
    contextMenu.style.display = 'none'
  }
})

changeColorInput.oninput = async () => {
  let taskToColorize = document.getElementById(contextMenu.taskId)
  taskToColorize.style.backgroundColor = changeColorInput.value
  await fetch('/tasks', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', id: contextMenu.taskId },
    body: JSON.stringify({ color: changeColorInput.value }),
  })
    .then((response) => response.text())
    .then((responseText) => console.log(responseText))
}

const changeBodyColorDiv = document.querySelector('#changeBodyColorDiv')
changeBodyColorDiv.oninput = async () => {
  body.style.backgroundColor = changeBodyColorDiv.lastChild.value
  await fetch('/globals', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', id: 'bodyColor' },
    body: JSON.stringify({ value: changeBodyColorDiv.lastChild.value }),
  })
    .then((response) => response.text())
    .then((responseText) => console.log(responseText))
}

const moveTask = (sourceElem, targetElem) => {
  let sourceCol = getColNum(sourceElem)
  let targetCol = getColNum(targetElem)
  let sourceRow = getRowNum(sourceElem)
  let targetRow = getRowNum(targetElem)
  let changesWereMade
  if (sourceCol === targetCol && !targetElem.classList.contains('add')) {
    changesWereMade = true
    if (sourceRow > targetRow) {
      insertBefore(sourceElem, targetElem)
    } else if (sourceRow < targetRow) {
      insertAfter(sourceElem, targetElem)
    }
  } else if (
    sourceCol === targetCol &&
    targetElem.classList.contains('add') &&
    sourceElem !== targetElem.previousElementSibling
  ) {
    changesWereMade = true
    insertBefore(sourceElem, targetElem)
  } else if (
    sourceCol !== targetCol &&
    !targetElem.classList.contains('addTaskType')
  ) {
    changesWereMade = true
    insertBefore(sourceElem, targetElem)
  }

  function updateTasksInDb(col) {
    column(col).children.forEach((task) => {
      if (task.nodeName === 'TASK-FIELD') {
        fetch('/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', id: task.id },
          body: JSON.stringify({
            column: col,
            row: getRowNum(task),
          }),
        })
          .then((response) => response.text())
          .then((responseText) => console.log(responseText))
      }
    })
  }
  if (changesWereMade === true) {
    if (sourceCol !== targetCol) {
      updateTasksInDb(sourceCol)
      updateTasksInDb(targetCol)
    } else updateTasksInDb(sourceCol)
  }
}

document.addEventListener('dragstart', (event) => {
  dragged = event.target
})
document.addEventListener('dragover', (event) => {
  event.preventDefault()
})
document.addEventListener('drop', (event) => {
  event.preventDefault()
  if (
    event.target.nodeName === 'TASK-FIELD' ||
    event.target.classList.contains('add')
  ) {
    moveTask(dragged, event.target)
  } else if (event.target.classList.contains('textDiv')) {
    moveTask(dragged, event.target.parentElement)
  }
})

function swapColumns(col1, col2) {
  let tmp = col2.outerHTML
  col2.outerHTML = col1.outerHTML
  col1.outerHTML = tmp
}

document.querySelector('#helpButton').onclick = () => {
  document.querySelector('#helpText').style.display = 'block'
}
document.querySelector('#helpButton').onblur = () => {
  document.querySelector('#helpText').style.display = 'none'
}

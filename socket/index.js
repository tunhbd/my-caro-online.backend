const socketIO = require('socket.io')
const uuidv1 = require('uuid/v1')

class Player {
  constructor (id, avatar, name) {
    this.id = id
    this.avatar = avatar
    this.name = name
    this.ready = false
  }
}

class Room {
  constructor ({ id, maxCount, players }) {
    if (players.length > maxCount) {
      throw new Error('Number of participants is not greater than maxCount')
    }

    this.id = id
    this.maxCount = maxCount
    this.players = players
  }

  readyPlayer (id) {
    const player = this.players.filter(pl => pl.id === id)[0]

    if (player) {
      player.ready = true
    }
  }

  addPlayer (player) {
    if (this.isFull()) {
      return false
    }

    this.players = [...this.players, player]

    return true
  }

  removePlayer (id) {
    this.players = this.players.filter(pl => pl.id !== id)
  }

  isFull () {
    return this.players.length === this.maxCount
  }

  isReady () {
    return this.players.every(pl => pl.ready)
  }
}

class RoomManager {
  constructor () {
    this.rooms = []
  }

  isExistsRoom (roomId) {
    return this.rooms.some(room => room.id === roomId)
  }

  addRoom (room) {
    if (this.isExistsRoom(room.id)) {
      return false
    }

    this.rooms = [...this.rooms, room]
  }

  removeRoom (id) {
    this.rooms = this.rooms.filter(room => room.id !== id)
  }

  findFreeRoom () {
    console.log('find free room', this.rooms)
    return this.rooms.filter(room => !room.isFull())[0]
  }

  getRoom (id) {
    return this.rooms.filter(room => room.id === id)[0]
  }
}

const roomManager = new RoomManager()

const countFollow = (
  board,
  x,
  y,
  browseBeforeX,
  browseAfterX,
  browseBeforeY,
  browseAfterY,
  beforeCondition,
  afterCondition
) => {
  let count = 1
  let result = [{ x, y }]
  let xx
  let yy
  let blockBefore = false
  const blockAfter = false

  xx = x + browseBeforeX
  yy = y + browseBeforeY
  while (beforeCondition(xx, yy)) {
    if (board[xx][yy]) {
      if (board[xx][yy] === board[x][y]) {
        count += 1
        result = [...result, { x: xx, y: yy }]
      } else {
        blockBefore = true
        break
      }
    }

    xx += browseBeforeX
    yy += browseBeforeY
  }

  xx = x + browseAfterX
  yy = y + browseAfterY
  while (afterCondition(xx, yy)) {
    if (board[xx][yy]) {
      if (board[xx][yy] === board[x][y]) {
        count += 1
        result = [...result, { x: xx, y: yy }]
      } else {
        blockBefore = true
        break
      }
    }

    xx += browseAfterX
    yy += browseAfterY
  }

  return { count, result, blockBefore, blockAfter }
}

const checkresponse = response => {
  return response.count >= 5 && (!response.blockBefore || !response.blockAfter)
}

const isWinner = (board, x, y) => {
  let response = null
  let res = {
    won: false,
    result: []
  }
  const rowCount = board.length
  const colCount = board[0] ? board[0].length : 0

  response = countFollow(
    board,
    x,
    y,
    -1,
    1,
    0,
    0,
    xx => xx > -1,
    xx => xx < rowCount
  )
  if (checkresponse(response)) {
    res.won = true
    res.result = response.result
  } else {
    response = countFollow(
      board,
      x,
      y,
      0,
      0,
      -1,
      1,
      (xx, yy) => yy > -1,
      (xx, yy) => yy < colCount
    )
    if (checkresponse(response)) {
      res.won = true
      res.result = response.result
    } else {
      response = countFollow(
        board,
        x,
        y,
        -1,
        1,
        -1,
        1,
        (xx, yy) => xx > -1 && yy > -1,
        (xx, yy) => xx < rowCount && yy < colCount
      )
      if (checkresponse(response)) {
        res.won = true
        res.result = response.result
      } else {
        response = countFollow(
          board,
          x,
          y,
          -1,
          1,
          1,
          -1,
          (xx, yy) => xx > -1 && yy < colCount,
          (xx, yy) => xx < rowCount && yy > -1
        )
        if (checkresponse(response)) {
          res.won = true
          res.result = response.result
        }
      }
    }
  }

  return res
}

const turnOfComputer = (board, x, y) => {
  const rowCount = board.length
  const colCount = board[0] ? board[0].length : 0

  while (true) {
    const nextX = Math.floor(Math.random() * rowCount)
    const nextY = Math.floor(Math.random() * colCount)

    if (!board[nextX][nextY]) {
      board[nextX][nextY] = 'O'
      return {
        nextBoard: board,
        nextX,
        nextY
      }
    }
  }
}

const configSocketIO = server => {
  const io = socketIO(server)
  const playGameNamespace = io.of('/play-game')

  playGameNamespace.on('connection', socket => {
    console.log('client', socket.id, 'connected to server')
    socket.emit('welcome to namespace', 'play-game')

    // play with computer
    // socket.on('play with computer', () => {
    //   socket.emit('start game', { firstPlayer: socket.id });
    // });

    // play with other player
    socket.on('find player', ({ player }) => {
      console.log('client', socket.id, 'want to find player')
      let room = roomManager.findFreeRoom()

      if (!room) {
        console.log('can not find any free room')
        console.log('create new room')
        room = new Room({
          id: uuidv1(),
          maxCount: 2,
          players: [new Player(socket.id, player.avatar, player.name)]
        })
        roomManager.addRoom(room)
        socket.join(room.id)
        socket.emit('joined room', { roomId: room.id })
      } else {
        console.log('found one free room')
        console.log('add client to this room')
        room.addPlayer(new Player(socket.id, player.avatar, player.name))
        socket.join(room.id)
        socket.emit('joined room', { roomId: room.id })
        socket.to(room.id).emit('vs player', {
          player: {
            ...room.players[1],
            ready: undefined
          }
        })
        socket.emit('vs player', {
          player: {
            ...room.players[0],
            ready: undefined
          }
        })
      }
    })

    socket.on('ready', ({ roomId }) => {
      const room = roomManager.getRoom(roomId)

      if (room) {
        room.readyPlayer(socket.id)
        socket.to(roomId).emit('player ready')
        if (room.isReady()) {
          playGameNamespace.in(roomId).emit('start game', {
            firstPlayer: room.players[Math.floor(Math.random() * 2)].id
          })
        }
      }
    })

    socket.on('finish match', ({ roomId }) => {
      // const room = roomManager.getRoom(roomId)
      roomManager.removeRoom(roomId)
    })

    socket.on('chat', ({ roomId, message }) => {
      socket.to(roomId).emit('chat', { message })
    })

    socket.on('draw', ({ roomId }) => {
      socket.to(roomId).emit('draw')
    })

    socket.on('confirm draw', ({ roomId, confirm }) => {
      socket.to(roomId).emit('confirm draw', { confirm })
      if (confirm) {
        playGameNamespace.in(roomId).emit('got winner', { id: null })
      }
    })

    socket.on('lose', ({ roomId }) => {
      socket.to(roomId).emit('lose')
    })

    socket.on('confirm lose', ({ roomId, confirm }) => {
      socket.to(roomId).emit('confirm lose', { confirm })
      if (confirm) {
        playGameNamespace.in(roomId).emit('got winner', { id: socket.id })
      }
    })

    socket.on('undo', ({ roomId }) => {
      socket.to(roomId).emit('undo')
    })

    socket.on('confirm undo', ({ roomId, confirm }) => {
      socket.to(roomId).emit('confirm undo', { confirm })
    })

    socket.on('next turn', ({ roomId, board, x, y }) => {
      let res = null
      console.log(roomId)
      if (!roomId) {
        res = isWinner(board, x, y)
        if (res.won) {
          console.log('got winner')
          // socket.to(roomId).emit('next turn', { board, x, y })
          socket.emit('got winner', {
            id: socket.id,
            result: res.result
          })
        } else {
          console.log('next')
          const { nextBoard, nextX, nextY } = turnOfComputer(board, x, y)
          res = isWinner(nextBoard, nextX, nextY)
          socket.emit('next turn', { board: nextBoard, x: nextX, y: nextY })

          if (res.won) {
            socket.emit('got winner', { id: 'COMPUTER', result: res.result })
          }
        }
      } else {
        res = isWinner(board, x, y)
        socket.to(roomId).emit('next turn', { board, x, y })

        if (res.won) {
          playGameNamespace
            .in(roomId)
            .emit('got winner', { id: socket.id, result: res.result })
        }
      }
    })
  })
}

module.exports = {
  configSocketIO
}

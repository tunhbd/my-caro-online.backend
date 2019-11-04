const socketIO = require('socket.io');
const uuidv1 = require('uuid/v1');

class Player {
  constructor(id, avatar, name) {
    this.id = id;
    this.avatar = avatar;
    this.name = name;
    this.ready = false
  }
}

class Room {
  constructor({ id, maxCount, players }) {
    if (players.length > maxCount) {
      throw new Error('Number of participants is not greater than maxCount');
    }

    this.id = id;
    this.maxCount = maxCount;
    this.players = players;
  }

  readyPlayer(id) {
    const player = this.players.filter(
      pl => pl.id === socket.id
    )[0];

    if (player) {
      player.ready = true
    }
  }

  addPlayer(player) {
    if (this.isFull()) {
      return false;
    }

    this.players = [
      ...this.players,
      player
    ];

    return true;
  }

  isFull() {
    return this.players.length === this.maxCount;
  }

  isReady() {
    return this.players.every(pl => pl.ready);
  }
}

class RoomManager {
  constructor() {
    this.rooms = [];
  }

  isExistsRoom(roomId) {
    return this.rooms.some(room => room.id === roomId);
  }

  addRoom(room) {
    if (this.isExistsRoom(room.id)) {
      return false;
    }

    this.rooms = [
      ...this.rooms,
      room
    ];
  }

  findFreeRoom() {
    console.log('find free room', this.rooms);
    return this.rooms.filter(room => !room.isFull())[0];
  }

  getRoom(id) {
    return this.rooms.filter(room => room.id === id)[0];
  }
}

const roomManager = new RoomManager();

const configSocketIO = server => {
  const io = socketIO(server);
  const playGameNamespace = io.of('/play-game');

  playGameNamespace.on('connection', socket => {
    console.log('client', socket.id, 'connected to server');
    socket.emit('welcome to namespace', 'play-game');

    // play with computer
    // socket.on('play with computer', () => {
    //   socket.emit('start game', { firstPlayer: socket.id });
    // });

    // play with other player
    socket.on('find player', ({ player }) => {
      console.log('client', socket.id, 'want to find player')
      let room = roomManager.findFreeRoom();

      if (!room) {
        console.log('can not find any free room');
        console.log('create new room');
        room = new Room({
          id: uuidv1(),
          maxCount: 2,
          players: [
            new Player(socket.id, player.avatar, player.name)
          ]
        });
        roomManager.addRoom(room);
        socket.join(room.id);
        socket.emit('joined room', { roomId: room.id });
      } else {
        console.log('found one free room');
        console.log('add client to this room');
        room.addPlayer(
          new Player(socket.id, player.avatar, player.name)
        );
        socket.join(room.id);
        socket.emit('joined room', { roomId: room.id });
        socket.to(room.id).emit('vs player', {
          player: {
            ...room.players[1],
            ready: undefined
          }
        });
        socket.emit('vs player', {
          player: {
            ...room.players[0],
            ready: undefined
          }
        });
      }
    });

    socket.on('ready', ({ roomId }) => {
      const room = roomManager.getRoom(roomId);

      room.readyPlayer(socket.id);
      socket.to(roomId).emit('player ready');
      if (room.isReady()) {
        playGameNamespace.in(roomId).emit('start game', {
          firstPlayer: room.players[
            Math.floor(Math.random() * 2)
          ].id
        })
      }
    });

    // socket.on('next turn', ({ roomId, board, x, y }) => {
    //   if (!roomId) {
    //     if (isWinner(board, x, y)) {
    //       socket.emit('got winner', {
    //         id: socket.id,
    //         board,
    //         x,
    //         y
    //       });
    //     } else {
    //       const { nextBoard, nextX, nextY } = turnOfComputer(board, x, y);

    //       if (isWinner(nextBoard, nextX, nextY)) {
    //         socket.emit('got winner', {})
    //       }
    //     }

    //     socket.emit('next turn', { board: nextBoard, x: nextX, y: nextY })
    //   } else {
    //     if (isWinner(board, x, y)) {
    //       playGameNamespace.in(roomId).emit('got winner', { id: socket.id, board, x, y });
    //     } else {
    //       socket.to(roomId).emit('next turn', { board, x, y });
    //     }
    //   }
    // })
  });
};

module.exports = {
  configSocketIO
}
const ZwiftLogMonitor = require('../index.cjs');

let zlm = new ZwiftLogMonitor({
    log: console.log,
});

zlm.on('ready', () => {

    let messages = zlm.getAllChat();
    // console.log(messages);
    
    let version = zlm.getGameVersion();
    let world = zlm.getWorld();
    let playerId = zlm.getPlayerid();
    let steeringMode = zlm.getSteeringMode();
    let sport = zlm.getSport();

    zlm.start();
});
    
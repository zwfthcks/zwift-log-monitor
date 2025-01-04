import { ZwiftLogMonitor } from '../index.mjs';

const zlm = new ZwiftLogMonitor({
    log: console.log,
});

zlm.on('ready', () => {
    const messages = zlm.getAllChat();
    // console.log(messages);
    
    const version = zlm.getGameVersion();
    const world = zlm.getWorld();
    const playerId = zlm.getPlayerid();
    const steeringMode = zlm.getSteeringMode();
    const sport = zlm.getSport();

    zlm.start();
});

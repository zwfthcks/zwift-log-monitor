# zwift-log-monitor

Last tested with: Zwift version 1.81.0


## How to Use

````
npm install https://github.com/zwfthcks/zwift-log-monitor
`````

In your code:

```
import ZwiftLogMonitor from "@zwfthcks/zwift-log-monitor";

let zlm = new ZwiftLogMonitor({
    log: console.log,
});

zlm.on("ready", () => {
    zlm.start();
});
```

ZwiftLogMonitor is an EventEmitter which tails `log.txt`, processing each new line for relevant data.

You have to listen for the 'ready' event and subsequently call the ```start``` method.

You can listen for the following events:

- **info**
  
  Also emitted from the `get<Something>` methods

- **chat**

  An object with the chat message attributes.

- **world** (string)
- **sport** (string)
- **steeringMode** (string)
- **playerId** (string)
- **pacePartner** (string|null)
- **gameVersion** (string)
- **rideon** (object)
- **rideons** (number) - the number of Ride Ons

Examples:

```
zlm.on("chat", async (chat) => {
  console.log(`(${chat.time}) ${chat.name || chat.user}: ${chat.message} (${chat.scope})`);
});
```
```
zlm.on("info", async (info) => {
  console.log(info);
});
```
```
zlm.on("world", async (world) => {
  console.log(world);
});
```
```
zlm.on("sport", async (sport) => {
  console.log(sport);
});
```
```
zlm.on("steeringMode", async (steeringMode) => {
  console.log(steeringMode);
});
```
```
zlm.on("playerId", async (playerId) => {
  console.log(playerId);
});
```
```
zlm.on("pacePartner", async (pacePartner) => {
  console.log(pacePartner);
});
```
```
zlm.on("gameVersion", async (gameVersion) => {
  console.log(gameVersion);
});
```


See also `src/test/run.cjs` and `src/test/run.mjs`.

## Methods

There are the following methods for extracting information already written to log.txt. 

All of theses methods accept an optional parameter `emit` which also will cause the events above to be emitted:

```
let version = zlm.getGameVersion(); // current game version
let world = zlm.getWorld(); // current world
let pacePartner = zlm.getPacePartner(); // current pace partner (or null)
let playerId = zlm.getPlayerid(); // current player ID
let steeringMode = zlm.getSteeringMode(); // current steering mode
let sport = zlm.getSport(); // current sport
```

You can also get all the chat messages as an array:

```
let messages = zlm.getAllChat(); // get all chat messages in log.txt
```

There is also a method to return ride ons as an array:

```
let messages = zlm.getAllRideOns(); // get all ride ons in log.txt
```



## Supported

- Node >=??


## Notes

An empty log.txt will be written if it doesn't already exist.

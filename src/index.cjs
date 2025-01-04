/**
 * @module @zwfthcks/ZwiftLogMonitor
 */

const EventEmitter = require('node:events')
const { getDocumentsPath } = require('platform-paths');


const fs = require('node:fs');
const path = require('node:path')

const Tail = require('always-tail');
const { match } = require('node:assert');

const patterns = {
  world :    /\[([^\]]*)\]\s+Loading WAD file 'assets\/Worlds\/world(\d*)\/data.wad/g ,
  position : /\[([^\]]*)\]\s+FPS\s*\d{1,3}(?:|\.\d{1,3}),\s*(\S+),\s*(\S+),\s*(\S+)/ ,
  // chat :     /\[([^\]]*)\]\s+NETWORK:Heard area message from (\S*) \((.*)\)/ ,
  // chat :     /\[([^\]]*)\]\s+Chat: (\D*)(\d+)\s\((\S+)\): (.*)/ ,
  chat :     /\[([^\]]*)\]\s+Chat:(?:\s*?(?<name>.*?)) (?<id>\d+)\s\((?<scope>[^\)]*)\): (?<msg>.*)/g ,
  // chatGlobal :     /\[([^\]]*)\]\s+Chat:(?:\s*?(?<name>.*?)) (?<id>\d+)\s\((?<scope>[^\)]*)\): (?<msg>.*)/g ,
  // rideon :     /\[([^\]]*)\]\s+HUD_Notify: (\S*) says Ride On!/ 
  rideon :     /\[([^\]]*)\]\s+HUD_Notify: (.*) says Ride On!/g ,
  // rideonGlobal :     /\[([^\]]*)\]\s+HUD_Notify: (.*) says Ride On!/g ,
  sport: /\[([^\]]*)\]\s+Setting sport to (\S+)/g,
  steeringMode: /\[([^\]]*)\]\s+INFO LEVEL: \[STEERING\] Steering Mode Set to: (\S+)/g,
}

// could also use this for world:
// [8:50:32] GAME_LoadLevel()  worldID = 5

// [14:01:33] Chat: Boldrin 1262019 (World): Cansei
// [14:01:45] Chat: 187475 (Paddock): Any
// [14:02:09] Chat: 8136 (GroupEvent): just a short 3% bump about midway - then rollers around volcano territory
// [14:02:09] Chat: 46976 (Leader - in paddock): Msg
//
//
// [16:30:44] Setting sport to CYCLING
// [16:30:44] INFO LEVEL: [STEERING] Steering Mode Set to: None




/**
 * ZwiftLogMonitor
 * 
 *
 * @class ZwiftLogMonitor
 * @extends {EventEmitter}
 */
class ZwiftLogMonitor extends EventEmitter {
  
  
  /**
   * Creates an instance of ZwiftLogMonitor.
   * @param {*} [options={}]
   * @memberof ZwiftLogMonitor
   */
  constructor(options = {}) {
    super()

    this._ready = false
    this._started = false

    // bind this for functions
    // this._checkBaseAddress = this._checkBaseAddress.bind(this)
    // this._getCachedScan = this._getCachedScan.bind(this)
    // this._writeCachedScanFile = this._writeCachedScanFile.bind(this)
    // this._readCachedScanFile = this._readCachedScanFile.bind(this)
    // this.readPlayerData = this.readPlayerData.bind(this)

    // initialise _options object with defaults and user set options
    this._options = {
      // zwiftlog: path to log.txt for Zwift
      // zwiftapp: the process name to look for
      zwiftapp: 'ZwiftApp.exe',
      // polling: interval between polling
      polling: 50,
      // override with called options:
      ...options
    }
    
    // other supported options:
    // log: function for logging, e.g. console.log
    

    // log can be set to e.g. console.log in options
    this.log = this._options?.log || (() => { }) 

    // 
    if (!options?.zwiftlog) {
      getDocumentsPath().then((documentsPath) => {
        // zwiftlog: path to log.txt for Zwift
        this._options.zwiftlog = path.resolve(documentsPath, 'Zwift', 'Logs', 'Log.txt')
        this._ready = true
        this.emit('ready')
      })
    } else {
      this._ready = true
      this.emit('ready')
    }

    
  }


  /**
   *
   *
   * @memberof ZwiftLogMonitor
   */
  start() {
    
    if (!this._ready) return false;

    this._started = false


    // establish tail

    if (!fs.existsSync(this._options.zwiftlog)) {
      fs.writeFileSync(this._options.zwiftlog, "");
      this.log('Did not find Zwift log file - writing an empty file')
    }


    let tail = new Tail(this._options.zwiftlog, '\n', { interval: 50 });
    // interval is set explicitly to ensure sufficiently frequent polling

    //
    tail.on('line', function(data) {
      
      // checking for pattern matches (most likely match is checked first for efficiency)
      
      if ((match  = patterns.position.exec(data))) {
        // position
        this.log("position", match[2], match[3], match[4])
      } else if (match = patterns.rideon.exec(data)) {
        // rideon
        // console.log("rideon", match[1], match[2])
        this.log("rideon", match[1], match[2])

        this.rideOnCount += 1;
      } else if (match = patterns.chat.exec(data)) {
        // chat
        //  matches are: 1 time  2 lastname  3 userid  4 type/scope  5 message
        //  send parameters are: time user message firstname lastname
        // windows['chat'].webContents.send('chat', match[1], match[2], match[3], '', '');
        this.log('chat', match[1], match[3], match[5], match[3] + ' (' + match[4] + ')', match[2]);
      } else if (match = patterns.world.exec(data)) {
        // world
        this.log('world', match[2])
      } else if (match = patterns.sport.exec(data)) {
        // sport
        this.log('sport', match[2])
      } else if (match = patterns.steeringMode.exec(data)) {
        // steering mode
        this.log('steeringMode', match[2])
      }

    });


    //
    tail.on('error', function(data) {
      // console.log("error:", data);
      this.log("tail error:", data);
    });

    tail.watch();
    // to unwatch and close all file descriptors, tail.unwatch();
     

    this._started = true
    
  }
  


  /**
   *
   *
   * @return {*} 
   * @memberof ZwiftLogMonitor
   */
  getPlayerid() {
    // Determine player ID from log.txt
    // this.log('Zwift log file:', this._options.zwiftlog)
    if (fs.existsSync(this._options.zwiftlog)) {
      let logtxt = fs.readFileSync(this._options.zwiftlog, 'utf8');
      
      // [12:02:30] NETCLIENT:[INFO] Player ID: 793163
      let patterns = {
        user :    /\[(?:[^\]]*)\]\s+(?:NETCLIENT:){0,1}\[INFO\] Player ID: (\d*)/g ,
      }
      
      let match;
      
      while ((match = patterns.user.exec(logtxt)) !== null) {
        let playerid = parseInt(match[1]);
        this.log(`Zwift seems to run with player ID: ${playerid} = ${('00000000' + playerid.toString(16)).substr(-8)}`)
        this.emit('info', `playerid ${playerid}`)
        return playerid
      }
    } 
  }

 
  /**
   *
   *
   * @return {*} 
   * @memberof ZwiftLogMonitor
   */
  getGameVersion() {
    // Determine game version from log.txt
    // this.log('Zwift log file:', this._options.zwiftlog)
    if (fs.existsSync(this._options.zwiftlog)) {
      let logtxt = fs.readFileSync(this._options.zwiftlog, 'utf8');

      // [15:56:28] Game Version: 1.26.1(101164) dda86fe0235debd7146c0d8ceb1b0d5d626ddf77
      let patterns = {
        version :    /\[(?:[^\]]*)\]\s+Game Version: ((?:\d+)\.(?:\d+)\.(?:\d+))/g ,
      }
      
      let match;
      
      while ((match = patterns.version.exec(logtxt)) !== null) {
        this.log(`Zwift seems to be version: ${match[1]}`)
        this.emit('info', `version ${match[1]}`)
        return match[1];
      }
    } 
  }
 
  /**
   *
   *
   * @return {*} 
   * @memberof ZwiftLogMonitor
   */
  getWorld() {
    // Determine world from log.txt
    // this.log('Zwift log file:', this._options.zwiftlog)
    if (fs.existsSync(this._options.zwiftlog)) {
      let logtxt = fs.readFileSync(this._options.zwiftlog, 'utf8');

      let match;
      let worldLoaded = 0;
      
      while ((match = patterns.world.exec(logtxt)) !== null) {
        worldLoaded = match[2];
      }
      this.log(`Zwift seems to have loaded world: ${worldLoaded}`)
      this.emit('info', `world ${worldLoaded}`)
      return worldLoaded;
    } 
  }


  getSport() {
    return this._getLastGeneric(patterns.sport, 2, 'Sport:')
  }

  getSteeringMode() {
    return this._getLastGeneric(patterns.steeringMode, 2, 'Steering mode:')
  }

  /**
   *
   *
   * @return {*} 
   * @memberof ZwiftLogMonitor
   */
  _getLastGeneric(pattern, matchItem, description = '') {
    // this.log('Zwift log file:', this._options.zwiftlog)
    if (fs.existsSync(this._options.zwiftlog)) {
      let logtxt = fs.readFileSync(this._options.zwiftlog, 'utf8');

      let match;
      let result;
      
      while ((match = pattern.exec(logtxt)) !== null) {
        result = match[matchItem];
      }
      this.log('info', `${description} ${result}`)
      this.emit('info', `${description} ${result}`)
      return result;
    } 
  }


  

  /**
   *
   *
   * @return {*} 
   * @memberof ZwiftLogMonitor
   */
  _getAllGeneric(pattern, matchItem, description = '') {
    // Determine world from log.txt
    // this.log('Zwift log file:', this._options.zwiftlog)
    if (fs.existsSync(this._options.zwiftlog)) {
      let logtxt = fs.readFileSync(this._options.zwiftlog, 'utf8');

      let match;
      let result = [];
      
      while ((match = pattern.exec(logtxt)) !== null) {
        result.push(match[matchItem]);
        this.emit('info', `${description} ${match[matchItem]}`)
      }
      return result;
    } 
  }



 
  /**
   *
   *
   * @return {*} 
   * @memberof ZwiftLogMonitor
   */
  getAllChat() {
    // this.log('Zwift log file:', this._options.zwiftlog)
    if (fs.existsSync(this._options.zwiftlog)) {
      let logtxt = fs.readFileSync(this._options.zwiftlog, 'utf8');

      let match;
      let messages = [];
      
      while ((match = patterns.chat.exec(logtxt)) !== null) {
        
                      //  matches are: 1 time  2 lastname  3 userid  4 type/scope  5 message
                //  send parameters are: time user message firstname lastname
                // windows['chat'].webContents.send('chat', match[1], match[2], match[3], '', '');
        this.log('chat', match[1], match[3], match[5], match[3] + ' (' + match[4] + ')', match[2]);
        this.emit('info', `chat ${match[1]} ${match[3]} ${match[5]} ${match[3]} (${match[4]}) ${match[2]}`) 
        messages.push({time: match[1], user: match[3], message: match[5], scope: match[4], name: match[2]});
      }
      return messages;
    } 
  }


  
}


module.exports = ZwiftLogMonitor


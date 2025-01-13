/**
 * @module @zwfthcks/ZwiftLogMonitor
 */

const EventEmitter = require('node:events')
const { getDocumentsPath } = require('platform-paths');

const fs = require('node:fs');
const path = require('node:path')

const Tail = require('always-tail');

const patterns = {
  world :    /\[([^\]]*)\]\s+Loading WAD file 'assets\/Worlds\/world(\d*)\/data.wad/g ,
  position : /\[([^\]]*)\]\s+FPS\s*\d{1,3}(?:|\.\d{1,3}),\s*(\S+),\s*(\S+),\s*(\S+)/ ,
  chat :     /\[([^\]]*)\]\s+Chat:(?:\s*?(?<name>.*?)) (?<id>\d+)\s\((?<scope>[^\)]*)\): (?<msg>.*)/g ,
  rideon :     /\[([^\]]*)\]\s+HUD_Notify: (.*) says Ride On!/g ,
  sport: /\[([^\]]*)\]\s+Setting sport to (\S+)/g,
  steeringMode: /\[([^\]]*)\]\s+INFO LEVEL: \[STEERING\] Steering Mode Set to: (\S+)/g,
  pacepartnerjoin: /\[([^\]]*)\]\s+PacePartnerAnalytics:  --PacePartnerJoin--/g,
  pacepartnerendjoin: /\[([^\]]*)\]\s+PacePartnerAnalytics:  --End PacePartnerJoin--/g,
  pacepartnerridesummary: /\[([^\]]*)\]\s+PacePartnerAnalytics:  --PacePartnerRideSummary--/g,
  pacepartnerendridesummary: /\[([^\]]*)\]\s+PacePartnerAnalytics:  --End PacePartnerRideSummary--/g,
  pacepartnername: /\[([^\]]*)\]\s+pace_partner_name: "([^"]*)"/g,
  pacepartner_nametype: /\[([^\]]*)\]\s+PacePartnerAnalytics:\s+--(?<type>PacePartnerJoin|PacePartnerRideSummary)--[\s\S]*?pace_partner_name: "(?<name>[^"]+)"/g,

}

// could also use this for world:
// [8:50:32] GAME_LoadLevel()  worldID = 5

// [14:01:33] Chat: TheName 1262019 (World): Cansei
// [14:01:45] Chat: 187475 (Paddock): Any
// [14:02:09] Chat: 8136 (GroupEvent): just a short 3% bump about midway - then rollers around volcano territory
// [14:02:09] Chat: 46976 (Leader - in paddock): Msg

// [16:30:44] Setting sport to CYCLING
// [16:30:44] INFO LEVEL: [STEERING] Steering Mode Set to: None

// [9:30:52] HUD_Notify: T.Nishikawa says Ride On!
// [9:30:52] Got Notable Moment: RIDE ON!


// [10:17:55] PacePartnerAnalytics:  --PacePartnerJoin--
// [10:17:55] PacePartnerAnalytics:    timestamp: "2025/01/11 09:17:55 UTC"
// [10:17:55] PacePartnerAnalytics:    activity_id: 1644167216
// [10:17:55] PacePartnerAnalytics:    session_id: "f7cfbef9-f729-4a43-a45c-38f9bec9c993"
// [10:17:55] PacePartnerAnalytics:    method_joined: "IN_GAME"
// [10:17:55] PacePartnerAnalytics:    pace_at_drop_in: "1.760000"
// [10:17:55] PacePartnerAnalytics:    pace_partner_category: "D"
// [10:17:55] PacePartnerAnalytics:    pace_partner_name: "D. Maria"
// [10:17:55] PacePartnerAnalytics:    pace_partner_id: "5147276"
// [10:17:55] PacePartnerAnalytics:    map_id: "Watopia"
// [10:17:55] PacePartnerAnalytics:    user_route_name: "Watopia's Waistband"
// [10:17:55] PacePartnerAnalytics:    pace_partner_route: "Watopia's Waistband"
// [10:17:55] PacePartnerAnalytics:    activity_sport: "CYCLING"
// [10:17:55] PacePartnerAnalytics:  --End PacePartnerJoin--


// [10:07:06] PacePartnerAnalytics:  --PacePartnerRideSummary--
// [10:07:06] PacePartnerAnalytics:    timestamp: "2025/01/11 09:04:11 UTC"
// [10:07:06] PacePartnerAnalytics:    activity_id: 1644167216
// [10:07:06] PacePartnerAnalytics:    session_id: "f7cfbef9-f729-4a43-a45c-38f9bec9c993"
// [10:07:06] PacePartnerAnalytics:    profile_weight_in_grams: xxxxx
// [10:07:06] PacePartnerAnalytics:    profile_ftp: xx
// [10:07:06] PacePartnerAnalytics:    activity_type: "SOLO_FREE_RIDE"
// [10:07:06] PacePartnerAnalytics:    avg_speed_mph: 20
// [10:07:06] PacePartnerAnalytics:    avg_watts: 228
// [10:07:06] PacePartnerAnalytics:    avg_cadence: 88
// [10:07:06] PacePartnerAnalytics:    distance_with_pace_partners: 1576.742188
// [10:07:06] PacePartnerAnalytics:    time_with_pace_partner_seconds: 174
// [10:07:06] PacePartnerAnalytics:    total_activity_time_in_session_seconds: 379
// [10:07:06] PacePartnerAnalytics:    pace_partner_category: "D"
// [10:07:06] PacePartnerAnalytics:    pace_partner_name: "D. Taylor"
// [10:07:06] PacePartnerAnalytics:    pace_partner_id: "5147250"
// [10:07:06] PacePartnerAnalytics:    map_id: "Watopia"
// [10:07:06] PacePartnerAnalytics:    user_route_name: "Flat Route"
// [10:07:06] PacePartnerAnalytics:    pace_partner_route: "Flat Route"
// [10:07:06] PacePartnerAnalytics:    activity_sport: "CYCLING"
// [10:07:06] PacePartnerAnalytics:    game_latitude: -11.650834
// [10:07:06] PacePartnerAnalytics:    game_longitude: 166.949751
// [10:07:06] PacePartnerAnalytics:    pace_partner_exit: EXIT_RANGE
// [10:07:06] PacePartnerAnalytics:  --End PacePartnerRideSummary--




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


    this._pacepartnerjoin = false;
    this._paceparnersummary = false;
    
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
        this.emit('position', {x: parseFloat(match[2]), y: parseFloat(match[3]), z: parseFloat(match[4])})
      } else if (match = patterns.rideon.exec(data)) {
        // rideon
        // console.log("rideon", match[1], match[2])
        this.log("rideon", match[1], match[2])
        this.emit('rideon', {time: match[1], user: match[2]})

        this.rideOnCount += 1;
        this.emit('rideons', this.rideOnCount)
      } else if (match = patterns.chat.exec(data)) {
        // chat
        //  matches are: 1 time  2 lastname  3 userid  4 type/scope  5 message
        //  send parameters are: time user message firstname lastname
        // windows['chat'].webContents.send('chat', match[1], match[2], match[3], '', '');
        this.log('chat', match[1], match[3], match[5], match[3] + ' (' + match[4] + ')', match[2]);
        this.emit('chat', {time: match[1], user: match[3], message: match[5], scope: match[4], name: match[2]});
      } else if (match = patterns.world.exec(data)) {
        // world
        this.log('world', match[2])
        this.emit('world', match[2])
      } else if (match = patterns.sport.exec(data)) {
        // sport
        this.log('sport', match[2])
        this.emit('sport', match[2])
      } else if (match = patterns.steeringMode.exec(data)) {
        // steering mode
        this.log('steeringMode', match[2])
        this.emit('steeringMode', match[2])
      } else if (match = patterns.pacepartnerjoin.exec(data)) {
        // pace partner join
        this.log('pacepartnerjoin', match[1])
        this._pacepartnerjoin = true;
      } else if (this._pacepartnerjoin && (match = patterns.pacepartnername.exec(data))) {
        // pace partner name
        this.log('pacepartnername', match[1])
        this.emit('pacepartner', match[2])
      } else if (match = patterns.pacepartnerendjoin.exec(data)) {
        // pace partner end join
        this.log('pacepartnerendjoin', match[1])
        this._pacepartnerjoin = false;
      } else if (match = patterns.pacepartnerridesummary.exec(data)) {
        // pace partner ride summary
        this.log('pacepartnerridesummary', match[1])
        this._pacepartnersummary = true;
      } else if (match = patterns.pacepartnerendridesummary.exec(data)) {
        // pace partner end ride summary
        this.log('pacepartnerendridesummary', match[1])
        this._pacepartnersummary = false;
        this.log('pacepartnername', null)
        this.emit('pacepartner', null)
      }

    });


    //
    tail.on('error', function(data) {
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
        this.emit('info', {version: match[1]})
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
      this.emit('info', { world: worldLoaded })
      return worldLoaded;
    } 
  }


  getPacePartner() {
    // determine pace partner from log.txt

    // find the last pace partner name in the log file between the last pacepartnerjoin and the last pacepartnerendjoin
    // if there is a end of ride summary after the last pace partner name, then there is no pace partner
    // if there is no end of ride summary, then the last pace partner name is the current pace partner

    this.log('Zwift log file:', this._options.zwiftlog)
    if (fs.existsSync(this._options.zwiftlog)) {

      let logtxt = fs.readFileSync(this._options.zwiftlog, 'utf8');
      let match;
      let result = null;

      while ((match = patterns.pacepartner_nametype.exec(logtxt)) !== null) {
        result = match.groups;
      }

      this.log('pace partner search:', result)
      this.emit('info', { pacepartner: result })
      return (result?.type === 'PacePartnerJoin') ? result.name : null;
    }
  }

      


    


  getSport() {
    return this._getLastGeneric(patterns.sport, 2, 'sport', 'Sport:')
  }

  getSteeringMode() {
    return this._getLastGeneric(patterns.steeringMode, 2, 'steeringMode', 'Steering mode:')
  }

  /**
   *
   *
   * @return {*} 
   * @memberof ZwiftLogMonitor
   */
  _getLastGeneric(pattern, matchItem, key, description = '') {
    // this.log('Zwift log file:', this._options.zwiftlog)
    if (fs.existsSync(this._options.zwiftlog)) {
      let logtxt = fs.readFileSync(this._options.zwiftlog, 'utf8');

      let match;
      let result;
      
      while ((match = pattern.exec(logtxt)) !== null) {
        result = match[matchItem];
      }
      this.log('info', `${description || key} ${result}`)
      this.emit('info', { [key]: result})
      return result;
    } 
  }


  

  /**
   *
   *
   * @return {*} 
   * @memberof ZwiftLogMonitor
   */
  _getAllGeneric(pattern, matchItem, key, description = '') {
    if (fs.existsSync(this._options.zwiftlog)) {
      let logtxt = fs.readFileSync(this._options.zwiftlog, 'utf8');

      let match;
      let result = [];
      
      while ((match = pattern.exec(logtxt)) !== null) {
        result.push(match[matchItem]);
        this.log('info', `${description || key} ${match[matchItem]}`)
        this.emit('info', { [key]: match[matchItem]})
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


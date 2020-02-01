const Discord = require("discord.js");
const Canvas = require("canvas");
const ffmpeg = require('ffmpeg')
const opusscript = require('opusscript');
const snekfetch = require("snekfetch");
const client = new Discord.Client();
const configu = require("./config.json");
const ytdl = require("ytdl-core");
const request = require("request");
const fs = require("fs");
const getYouTubeID= require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");
var config = JSON.parse(fs.readFileSync('./settings.json', 'utf-8'));
const servers = {};
const yt_api_key = config.key;
const bot_cntroller = config.bot_controller;
const prefix = config.prefix;
const discord_token = config.discord_token;
var guilds = {};
var queue = [];
var isPlaying = false;
var dispatcher = null;
var voiceChannel = null;
var skipReq = 0;
var skippers = [];
var SWFReader = require('swf-reader');

const EventEmitter = require("events");
class MyEmitter extends EventEmitter{}
EventEmitter.defaultMaxListeners = 1000;
var emitter = new MyEmitter();
//emitter.setMaxListeners(40);

client.login(discord_token);


//hola

client.on('message', function(message){
  const member = message.member;
  const mess = message.content.toLowerCase();
  const args = message.content.split(' ').slice(1).join(" ");
  if(mess.startsWith(prefix + "reproducir")){
    if(message.member.voiceChannel || member.voiceChannel){
    if(queue.length > 0 || isPlaying){
      getID(args, function(id){
        add_to_queue(id);
        fetchVideoInfo(id, function(err, videoInfo){
          if(err) throw new Error(err);
          message.reply(" Ahora reproduciendo **" + videoInfo.title + "**");
        });
      });
    }else{
      isPlaying = true;
      getID(args, function(id){
        queue.push("placeholder");
        playMusic(id, message);
        fetchVideoInfo(id, function(err, videoInfo){
          if(err) throw new Error(err);
          message.reply(" Ahora reproduciendo **" + videoInfo.title + "**");
        });
      });
    }
  }else{
    message.reply("Tenes que estar en un canal de voz");
  }
  }else if(mess.startsWith(prefix + "saltear")){
    if(skippers.indexOf(message.author.id) === -1 ){
      skippers.push(message.author.id);
      skipReq++;
      if(skipReq >= Math.ceil(voiceChannel.members.size - 1) / 2){
        skip_song(message);
        message.reply(" Salteando ");
      } else{
       message.reply(" Necesitas" + Math.ceil((voiceChannel.members.size -1) / 2) - skipReq)+ "votos mas!";
    }
  } else{
    message.reply("vos ya votaste para saltear!");
  }
}
});

/*var servers = {};
function play(connection, message){
   var server = servers[message.guild.id];
   server.dispatcher = connection.playStream(YTDL(server.queue[0], {filter: "audioonly"}));
   server.queue.shift();
   server.dispatcher.on("end", function(){
     if(server.queue[0]) play(connection, message);
     else connection.disconnect();
   });
}*/
/*Ver Participantes de Sorteo*/
client.on('message', message =>{
if(message.content.startsWith("+participantes")){
    let roleName = message.content.split(" ").slice(1).join(" ");

    //Filtering the guild members only keeping those with the role
    //Then mapping the filtered array to their usernames
    let membersWithRole = message.guild.members.filter(member => {
        return member.roles.find(ch => ch.name === '🍀-Participantes-🍀');
    }).map(member => {
        return member.user.username;
    })

    let embed = new Discord.RichEmbed({
        "title": `Usuarios participantes del sorteo:`,
        "description": membersWithRole.join(", "),
        "color": 0xFFFF
    });

    return message.channel.send({embed});
}
});

/*PArticipar de sorteo*/
client.on('message', message =>{
if(message.content.startsWith("+participar")){
    var role = message.guild.roles.find(ch => ch.name ==='🍀-Participantes-🍀');
    message.member.addRole(role.id);
};
});

/*Remover participantes del sorteo
client.on('message', message =>{
if(message.content.startsWith("+removerparticipantes")){
 var role = message.guild.roles.find(ch => ch.name ==='🍀-Participantes-🍀');
  role.delete();
}
});*/


/*SORTEO
client.on("ready", function() {
  var Count;
  for(Count in client.users.array()){
  var User = client.users.array()[Count];
  console.log(User.username);
}
});*/

client.on("ready", () => {
  console.log("I am ready!");
});

function skip_song(message){
  dispatcher.end();
  if(queue.length > 1){
    playMusic(queue[0], message);
  } else{
    skipReq = 0;
    skippers = [];
  }
}

function playMusic(id, message){
  voiceChannel = message.member.voiceChannel;
  voiceChannel.join().then(function (connection){
    stream = ytdl("https://www.youtube.com/watch?v=" + id,{
      filter: 'audioonly'
  });
  slipReq = 0;
  skippers = [];
  dispatcher = connection.playStream(stream);
  dispatcher.on("end", function(){
    skipReq = 0;
    skippers = [];
    queue.shift();
    if(queue.length === 0){
      queue = [];
      isPlaying = false;
    } else {
      playMusic(queue[0], message);
    }
  });
});
}


function getID(str, cb){
  if(isYouTube(str)){
    cb(getYouTubeID(str));
  } else{
    search_video(str, function(id){
      cb(id);
    });
  }
}

function add_to_queue(strID){
  if(isYouTube(strID)){
  queue.push(getYouTubeId(strID));
} else {
  queue.push(strID);
}
}


function search_video(query, callback){
  request ("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body){
  var json = JSON.parse(body);
  callback(json.items[0].id.videoId);
});
}



function isYouTube(str){
  return str.toLowerCase().indexOf("youtube.com") > - 1;

}


/*
client.on("message", function(message){
  if (!message.content.startsWith(prefix)) return;
//if(message.member.roles.find((ch => ch.name ==='📜-Moderador-📜'))){
var args = message.content.substring(prefix.lenght).split(" ");
switch (args[0].toLowerCase()){
  case "+reproducir":
      if(!args[1]) {
      message.channel.sendMessage("Porfavor provee un link");
      return;
      }
      if(!message.member.voiceChannel){
        message.channel.sendMessage("Debes estar en un canal de voz");
        return;
      }
      if(!servers[message.guild.id]) servers[message.guild.id] = {
        queue: []
      };
      var server = servers[message.guild.id];

      server.queue.push(args[1]);
      if(!message.guild.voiceConnection) message.member.voiceChannel.join().then(function(connection){
        play(connection, message);
      });
      break;
  case "saltear":
      var server = servers[message.guild.id];
      if(server.dispatcher) server.dispatcher.end();
      break;
  case "parar":
      var server = servers[message.guild.id];
      if(message.guild.voiceConnection) message.guild.voiceConnection.disconnect();
}
//}
});
*/


client.on("message", (message) => {
if(message.member.roles.find((ch => ch.name === '📜-Moderador-📜'))){
if (message.content.startsWith(prefix + "axelenladuchahd")) {
message.channel.send("some text", {
    file: "https://media.discordapp.net/attachments/494349508298276875/494638462092443649/4493001572_5d0fbe4f47_o.jpg"
});
}
}
});


client.on("message", (message) => {
if (message.content.startsWith(prefix + "parar")) {
  var server = servers[message.guild.id];
  if(message.guild.voiceConnection) message.guild.voiceConnection.disconnect();
}
});

client.on("message", (message) => {
  if (message.content.startsWith("hacemeunhuevofrito")) {
    message.channel.send("Y porque no te haces una teta al hornou!");
  }
});

client.on("message", (message) => {
  var voiceChannel = message.member.voiceChannel;
  if (message.content.startsWith("+sorpresa")) {
    message.channel.send("Los voy a matar de la risa!!", {
        file: "https://i.ytimg.com/vi/e1UwQI2UdZs/maxresdefault.jpg"
    });
    voiceChannel.join().then(connection =>{const dispatcher = connection.playFile('./desquiciado.mp3'); dispatcher.on("end", end => {voiceChannel.leave();});}).catch(err => console.log(err));
}
});

client.on("message", (message) => {
  // If the message is "what is my avatar"
  if (message.content.startsWith("cualesmiavatar")) {
    // Send the user's avatar URL
    message.channel.send(author.avatarURL);
  }
});
client.on('message', message =>{
  if(message.author.bot) return undefined;
  let msg = message.content.toLowerCase();
  let args = message.content.slice(prefix.length).trim().split(' ');
  let command = args.shift().toLowerCase();
  if(command === 'avatar'){
  let user = message.mentions.users.first() || message.author;

  let embed = new Discord.RichEmbed()
  .setAuthor(`${user.username}`)
  .setImage(user.displayAvatarURL)
  message.channel.send(embed)
  }
});



const applyText = (canvas, text) => {
    const ctx = canvas.getContext('2d');

    // Declare a base size of the font
    let fontSize = 70;

    do {
        // Assign the font to the context and decrement it so it can be measured again
        ctx.font = `${fontSize -= 10}px sans-serif`;
        // Compare pixel width of the text to the canvas minus the approximate avatar size
    } while (ctx.measureText(text).width > canvas.width - 300);

    // Return the result to use in the actual canvas
    return ctx.font;
};


client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.find(ch => ch.name === '🌌recepcion🌌');
    if (!channel) return;

    const canvas = Canvas.createCanvas(1200, 472);
    const ctx = canvas.getContext('2d');

    const background = await Canvas.loadImage('./welcome-image.jpg');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#74037b';
    ctx.strokeRect(300, 0, canvas.width, canvas.height);

    // Slightly smaller text placed above the member's display name
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Welcome to the server,', canvas.width / 2.5, canvas.height / 3.5);

    // Add an exclamation point here and below
    ctx.font = applyText(canvas, `${member.displayName}!`);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${member.displayName}!`, canvas.width / 2.5, canvas.height / 1.8);

    ctx.beginPath();
    ctx.rect(20,20,200,200);
    //ctx.arc(125, 125, 100, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    const { body: buffer } = await snekfetch.get(member.user.displayAvatarURL);
    const avatar = await Canvas.loadImage(buffer);
    ctx.drawImage(avatar, 25, 25, 200, 200);

    const attachment = new Discord.Attachment(canvas.toBuffer(), 'welcome-image.jpg');

    channel.send(`Welcome to the servero, ${member}!`, attachment);
});


client.on("message", msg => {
    if (msg.content.toLowerCase().startsWith(prefix + "borrarchat")) {
        async function clear() {
            msg.delete();
            const fetched = await msg.channel.fetchMessages({limit: 99});
            msg.channel.bulkDelete(fetched);
        }
        clear();
    }
});

client.on("message", msg => {
    if(msg.guild.roles.find((ch => ch.name === 'Administrador'))){
    if (msg.content.toLowerCase().startsWith(prefix + "borrarchut")) {
        async function clear() {
            msg.delete();
            const fetched = await msg.channel.fetchMessages({limit: 99});
            msg.channel.bulkDelete(fetched);
        }
        clear();
    }
  }
});


    //if(msg.member.permissions.has('ADMINISTRATOR')){

/*client.on("message", message=> {
    if (message.content.toLowerCase().startsWith(prefix + "loop")) {
      var interval = setInterval (function () {
        message.channel.send("Numero1")
      }, 1 * 1000);
    }
});*/


// add message as a parameter to your callback function


/*CODIGO REPETIR FRASE 4 VECES Y PARAR
client.on('message', function(message) {
    // Now, you can use the message variable inside
var i = 0;
    if (message.content === "$loop") {
        var interval = setInterval (function () {
            // use the message's channel (TextChannel) to send a new message
            message.channel.send("123")
            i++
           if(i==4){
              clearInterval(interval);
}
        }, 1 * 1000);
    }
});*/





client.on('message', function(message) {
    // Now, you can use the message variable inside
    if(message.member.roles.find(ch => ch.name === '⚓-Creador-⚓'){
var i = 0;
  if (message.content === "$sortear") {
  message.channel.send("SORTEANDO GANADOR:");
let membersWithRole = message.guild.members.filter(member => {
        return member.roles.find(ch => ch.name === '🍀-Participantes-🍀');
    }).map(member => {
        return member.user;
    })
var intervalo = setInterval (function(){
  nombresito = membersWithRole[Math.floor(Math.random() * membersWithRole.length)];
  channel = message.guild.channels.find(ch => ch.name === '🎹-composiciones-🎹');


 message.channel.send(nombresito.username);
message.channel.bulkDelete(1);
  i++;
  if(i==4){
     clearInterval(intervalo);
      lol(nombresito, channel).then();
}
}, 1 * 1000);

}
}
});

async function lol(nombresito, channel){
  const canvas = Canvas.createCanvas(1200, 472);
  const ctx = canvas.getContext('2d');

  const background = await Canvas.loadImage('./driftboys.jpg');
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#74037b';
    ctx.strokeRect(300, 0, canvas.width, canvas.height);

    // Slightly smaller text placed above the member's display name
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('El ganador es:,', canvas.width / 2.5, canvas.height / 3.5);

    // Add an exclamation point here and below

    ctx.font = applyText(canvas, `${nombresito.displayName}!`);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${nombresito.username}!`, canvas.width / 2.5 - 125, canvas.height / 1.8 + 200);

    ctx.beginPath();
    ctx.rect(300,300,200,200);
    //ctx.arc(125, 125, 100, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    const { body: buffer } = await snekfetch.get(nombresito.displayAvatarURL);
    const avatar = await Canvas.loadImage(buffer);
    ctx.drawImage(avatar, 300, 300, 200, 200);

    const attachment = new Discord.Attachment(canvas.toBuffer(), 'welcome-image.jpg');

    channel.send(`FELICIDADES, ${nombresito.username}!, GANASTE!!!!!!`, attachment);
  }

client.on("message", msg => {
    if (msg.content.toLowerCase().startsWith(prefix + "driftear")) {
        async function clear() {
            msg.delete();
            const fetched = await msg.channel.fetchMessages({limit: 99});
            msg.channel.bulkDelete(fetched);
        }
        clear();
    }
});

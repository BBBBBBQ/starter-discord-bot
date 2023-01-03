// const { clientId, guildId, token, publicKey } = require('./config.json');
require('dotenv').config()
const APPLICATION_ID = process.env.APPLICATION_ID 
const TOKEN = process.env.TOKEN 
const PUBLIC_KEY = process.env.PUBLIC_KEY || 'not set'
const GUILD_ID = process.env.GUILD_ID 


const axios = require('axios')
const express = require('express');
const { InteractionType, InteractionResponseType, verifyKeyMiddleware } = require('discord-interactions');


const app = express();
// app.use(bodyParser.json());

const discord_api = axios.create({
  baseURL: 'https://discord.com/api/',
  timeout: 3000,
  headers: {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
	"Access-Control-Allow-Headers": "Authorization",
	"Authorization": `Bot ${TOKEN}`
  }
});


app.post('/interactions', verifyKeyMiddleware(PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    console.log(interaction.data.name)
    if(interaction.data.name == 'yo'){
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `よう！ ${interaction.member.user.username}!`,
        },
      });
    }

    if(interaction.data.name == 'dm'){
      let c = (await discord_api.post(`/users/@me/channels`,{
        recipient_id: interaction.member.user.id
      })).data
      try{
        let res = await discord_api.post(`/channels/${c.id}/messages`,{
          content:'Yo! I got your slash command. I am not able to respond to DMs just slash commands.',
        })
        console.log(res.data)
      }catch(e){
        console.log(e)
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data:{
          content:'👍'
        }
      });
    }
  }

});



app.get('/register_commands', async (req,res) =>{
  let slash_commands = [
    {
      "name": "yo",
      "description": "replies with Yo!",
      "options": []
    },
    {
      "name": "dm",
      "description": "sends user a DM",
      "options": []
    }
  ]
  try
  {
    let discord_response = await discord_api.put(
      `/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`,
      slash_commands
    )
    console.log(discord_response.data)
    return res.send('commands have been registered')
  }catch(e){
    console.error(e.code)
    console.error(e.response?.data)
    return res.send(`${e.code} error from discord`)
  }
})


app.get('/', async (req,res) =>{
  return res.send('Follow documentation ')
})


app.listen(8999, () => {
    console.log(`Example server listening on port 8999`)
})

//FROM HE

app.use(express.json())

const DISCORD_URL = "https://discord.com/api/webhooks/1043483533714411561/wCAXzzQKzB3kjKOKpLYIjCi9xTmXw_6KzcD65cU3FRLFsR-JY9c-72zxAX2gNOZpweh4";

app.post("/discord", async (req, res) => {
  const mint = await solanaConnection.getTransaction(req.body[0].signature)
  console.log("ミント取って来れました" + mint)
  postToDiscord(req.body[0]);
})

const postToDiscord = (txn) => {
    const dateString = new Date(txn.timestamp * 1000).toLocaleString();
//ミントアドレスを変数にいれる
//const mintAD = txn.nfts[0].mint //⭕ここの指定がうまく行かない
//console.log("ミントアドレスをゲットしました" + mintAD)
//getMetadataMEをする

//足りない要素を入れてあげる
//何がうれたか現物の名前
//プライス　amount から計算してあげる　クラッシュするかも
//日付　これも　 timestamp から変更してあげる
//画像

  axios.post(DISCORD_URL,
    {
      "embeds": [
        {
          "title": "SALE更新確認",
          "description": txn.description,
          "fields": [
            {
                "name": "Price",
                "value": `SIGN ${txn.signature} SOL`,
                "inline": true
            },
            {
                "name": "Mint",
                "value": `MintAD`, //${mintAD}
                "inline": true
            },
            {
                "name": "Date",
                "value": dateString,
                "inline": true
            },
            {
                "name": "Explorer",
                "value": `https://explorer.solana.com/tx/${txn.signature}`,
                "inline": true
            }
          ],
        }
      ]
    }
  )
}

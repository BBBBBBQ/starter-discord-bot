// const { clientId, guildId, token, publicKey } = require('./config.json');
require('dotenv').config()
const APPLICATION_ID = process.env.APPLICATION_ID 
const TOKEN = process.env.TOKEN 
const PUBLIC_KEY = process.env.PUBLIC_KEY || 'not set'
const GUILD_ID = process.env.GUILD_ID 


const axios = require('axios')
const express = require('express');
const { InteractionType, InteractionResponseType, verifyKeyMiddleware } = require('discord-interactions');
const solanaWeb3 = require('@solana/web3.js');
const { Connection, programs } = require('@metaplex/js');
const url = solanaWeb3.clusterApiUrl('mainnet-beta');
const solanaConnection = new solanaWeb3.Connection(url, 'confirmed');

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
  const trn = await solanaConnection.getTransaction(req.body[0].signature)
  const mint = trn.meta.postTokenBalances[0].mint
  console.log("ミント取って来れました" + mint)
  //getMetadataMEをする
  const meta = await getMetadataME(mint)
  postToDiscord(req.body[0],mint,meta);
})

const postToDiscord = (txn ,mintAD ,metadata) => {
    const dateString = new Date(txn.timestamp * 1000).toLocaleString();

  axios.post(DISCORD_URL,
    {
      "embeds": [
        {
          "title": "SALE 名前MEから持ってきた",
          "description": metadata.name, 
          "fields": [
            {
                "name": "Price",
                "value": `SIGN ${txn.signature} SOL`, //値段
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
          "image": {
            "url": `picture`, //絵
            }
        }
      ]
    }
  )
}

const getMetadataME = async (tokenPubKey) => {        
  try {
      const { data } = await axios.get('https://api-mainnet.magiceden.dev/v2/tokens/' + tokenPubKey);   
      return data;
  } catch (error) {
      console.log("error fetching MEmetadata: ", error)                 
  }
}
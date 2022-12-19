// const { clientId, guildId, token, publicKey } = require('./config.json');
require('dotenv').config()
const APPLICATION_ID = process.env.APPLICATION_ID 
const TOKEN = process.env.TOKEN 
const PUBLIC_KEY = process.env.PUBLIC_KEY || 'not set'
const GUILD_ID = process.env.GUILD_ID 
const CHANNEL_ID = "1035078884359684136"

const axios = require('axios')
const express = require('express');
const { InteractionType, InteractionResponseType, verifyKeyMiddleware } = require('discord-interactions');
let wakeB = "F"

const app = express();
// app.use(bodyParser.json());

const apiURL = "https://api.helius.xyz/v0/addresses"
const address = "Fxjy8g9ABo8ZcZEh8B3M21fZdz8Sb56mVBpBznKynw6B" //ロイヤリティ
const resource = "nft-events"
const options = `api-key=c4b5b565-3a26-45e2-b28c-e3c96cbae8c1&type=NFT_SALE` //APIキーを入れる
let mostRecentTxn = ""
const pollingInterval = 5000; // ms

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

    if(interaction.data.name == 'wake'){
        //投稿の準備する
        runSalesBot();
      }

    if(interaction.data.name == 'wakeup'){
      wakeB = "T"
      try{
        let res = await discord_api.post(`/channels/${CHANNEL_ID}/messages`,{
          content:'おはようございま-す!',
          "embeds": [{
            "title": "BOT起動完了！",
            "description": "実行中〜"
          }]
        })
        console.log(res.data)
      }catch(e){
        console.log(e)
      }
    }

    if(interaction.data.name == 'yo'){
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `よう！ ${interaction.member.user.username}!`,
        },
      });
    }
  
    if(interaction.data.name == 'post2d'){
        try{
          let res = await discord_api.post(`/channels/${CHANNEL_ID}/messages`,{
            content:'Yo!',
            "embeds": [{
              "title": "Hello, Embed!",
              "description": "This is an embedded message."
            }]
          })
          console.log(res.data)
        }catch(e){
          console.log(e)
        }
    }

    if(interaction.data.name == 'dm'){
      // https://discord.com/developers/docs/resources/user#create-dm
      let c = (await discord_api.post(`/users/@me/channels`,{
        recipient_id: interaction.member.user.id
      })).data
      try{
        // https://discord.com/developers/docs/resources/channel#create-message
        let res = await discord_api.post(`/channels/${c.id}/messages`,{
          content:'Yo! I got your slash command. I am not able to respond to DMs just slash commands.',
        })
        console.log(res.data)
      }catch(e){
        console.log(e)
      }

      return res.send({
        // https://discord.com/developers/docs/interactions/receiving-and-responding#responding-to-an-interaction
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data:{
          content:'👍'
        }
      });
    }
  }

});

const runSalesBot = async () => {
    console.log("starting sales bot...");
    while (true) {
        let url = `${apiURL}/${address}/${resource}?${options}&until=${mostRecentTxn}`
        const { data } = await axios.get(url)

        if (!data.length) {
            console.log("polling...")
            await timer(pollingInterval);
            continue; } 
            
        for (let i = data.length - 96; i >= 0; i--) {
            try {
                const mintAD = data[i].nfts[0].mint //ミントアドレス
                const dateString = new Date(data[i].timestamp * 1000).toLocaleString();
                const P_row = data[i].amount* 0.000000001 
                const price = ((Math.round(P_row * 1000)) / 1000)
                console.log("ミントアドレスはーーーーーー→" + mintAD)
                const metadata = await getMetadataME(mintAD);
                if (!metadata) {
                    console.log("couldn't get metadata");
                    continue;
                }
                else printSalesInfo(dateString, price, data[i].signature, metadata.name, data[i].source, metadata.image);                                      
                await postSalesToDiscord(metadata.name, price, dateString, data[i],signature, metadata.image)
                await timer(pollingInterval);        
                }
            catch (err) {
                        console.log("error while going through getMetadataME(mintAD)まわりのtryの中で", err);
                        continue;
                } 
            
            lastKnownSignature = data[i].signature;
            if (lastKnownSignature) {
                mostRecentTxn = lastKnownSignature;
                console.log("lastknownsignatureに " + mostRecentTxn + " を入れました");
            }
        }
    }
} 


////////////
const postSalesToDiscord = async (title, price, date, signature, imageURL) => {
    try{
        let res = await discord_api.post(`/channels/${CHANNEL_ID}/messages`,{
        content:'NEW SALES',
        "embeds": [
            {
                "title": `SALE`,
                "description": `${title}`,
                "fields": [
                    {
                        "name": "Price",
                        "value": `${price} SOL`,
                        "inline": true
                    },
                    {
                        "name": "Date",
                        "value": `${date}`,
                        "inline": true
                    },
                    {
                        "name": "Explorer",
                        "value": `https://explorer.solana.com/tx/${signature}`
                    }
                ],
                "image": {
                    "url": `${imageURL}`,
                }
            }]  
        })
        console.log(res.data)
    }catch(e){
        console.log(e)
    }
}

/////////////////

const printSalesInfo = (date, price, signature, title, marketplace, imageURL) => {
    console.log("-------------------------------------------")
    console.log(`Sale at ${date} ---> ${price} SOL`)
    console.log("Signature: ", signature)
    console.log("Name: ", title)
    console.log("Image: ", imageURL)
    console.log("Marketplace: ", marketplace)
}

/////////////////

const getMetadataME = async (tokenPubKey) => {                                                            //tokenPubkey = 取引されたNFTのミントアドレス
    try {
        const { data } = await axios.get('https://api-mainnet.magiceden.dev/v2/tokens/' + tokenPubKey);   //{data}にいれる。GETする（MEのこのNFTについてのURL）の情報を｛配列｝として
        return data;                                                                                      //MEのAPIをaxios.getで叩いて、当該のNFTについてのメタ情報を"data"として返すよ。
    } catch (error) {
        console.log("error fetching MEmetadata: ", error)
    }
}

////////////////

const timer = ms => new Promise(res => setTimeout(res, ms))

//////////////////////////////////////ここから下

//ポストしたいよ〜　の受け口をつくります。ここにPOSTしたら、DICSCORDに投稿してくれるようにセットします。
app.post('/sales_post', async (req,res) =>{
  const interaction = req.body;
	console.log("SALES アップデートしました！")
	console.log("リクエストの中身は→" + interaction.price)
  //ボットが起きてるかチェックする
  //if (wakeB == "T"){
  //チャンネルにメッセージ送ってみる　⭕ここから編集再開する
  try{
    let res = await discord_api.post(`/channels/${CHANNEL_ID}/messages`,{
      content:'SALES!',
      "embeds": [
        {
          "title": `SALE`,
          "description": interaction.title,
          "fields": [
            {
                "name": "Price",
                "value": `${interaction.price} SOL`,
                "inline": true
            },
            {
                "name": "Date",
                "value": `${interaction.date}`,
                "inline": true
            },
            {
                "name": "Explorer",
                "value": `https://explorer.solana.com/tx/${interaction.signature}`
            }
        ],
          "image": {
            "url": `${interaction.imageURL}`,
          }
        }
      ]
      // "embeds": [
      //   {
      //   "title": "SALES UPDATE",
      //   "description": "情報更新しまーす" + req.
      // }]
    })
    // console.log(res.data)
  }catch(e){
    console.log(e)
  }
// } else {
//   console.log("Wake the bot first!");
// }
})


//////////////////////////////////////ここから上



app.get('/register_commands', async (req,res) =>{
  let slash_commands = [
    {
      "name": "yo",
      "description": "replies with Yo!",
      "options": []
    },
    {
        "name": "wake",
        "description": "BOTを起動します",
        "options": []
    },
    {
      "name": "wakeup",
      "description": "BOTの起動サンプル",
      "options": []
    },
    {
      "name": "post2d",
      "description": "メッセージ送れるかテストする",
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
    // api docs - https://discord.com/developers/docs/interactions/application-commands#create-global-application-command
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

})

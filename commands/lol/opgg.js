
const axios = require("axios");
const cheerio = require("cheerio");
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('opgg')
		.setDescription('Finds OPGG statistics.')
        .addStringOption(option =>
			option
				.setName('username')
				.setDescription('The username to find.')
                .setRequired(true)),
	async execute(interaction) {
        const baseUrl = "https://op.gg/summoners/na/";
        const user = interaction.options.getString("username");
        scrape(baseUrl+user, interaction);
	},
};

async function scrape(url, interaction){
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);;
    var content = $('meta[name="description"]').attr("content");
    var stats = content.split("/");
    for(var x = 0; x < stats.length; x++){
        stats[x] = stats[x].trim();
    }
    //console.log(stats);

    if(stats.length <= 1) {
        interaction.reply("User doesn't exist.")
        return;
    }
    var msg = concatenate(stats);
    interaction.reply(msg);
}

function concatenate(strarray){
    if (strarray.length < 4) {
        return "**Name: **" + strarray[0] + "\n**Level: **" + strarray[2] +"\nNo Stats Found.";
    }
    
    var msg = "**Name: **" +strarray[0];

    var rankinfo = strarray[1].split(" ");
    msg += "\n**Rank:** " + rankinfo[0] + " " + rankinfo[1] + " **|** " + rankinfo[2];

    var ratio = strarray[2].split(" ");
    var wr = ratio[2] + " " + "Rate:** " + ratio[4];
    msg += "\n**" + wr + " **|** " + ratio[0] + "-" + ratio[1];

    var champinfo = strarray[3].split(",");
    msg += "\n**Most Played Champions:**";
    msg += "\n**------------------------------**";
    for(var x = 0; x < champinfo.length; x++){
        msg += "\n" + champinfo[x].trim();
    }

    return msg;
}
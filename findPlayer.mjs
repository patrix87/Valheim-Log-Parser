import fs from "fs"

const files = fs.readdirSync(".\\")

const logs = files.filter(file => file.endsWith(".log"))

const maxLines = 10
const maxPlayerIndex = 20

const SteamApiKey = "YOUR KEY HERE";

const players = []
const final = []
const regexSteamID = /(?<=SteamID )(\d+)/;
const regexPlayerName = /(?<=ZDOID from )([^:]+)/;
const regexPlayerIndex = /(?<=\d{3,}:)(\d+)/g;

const pushCombo = (steamID, playerName) => {
	const index = players.findIndex(item => (item.steamID === steamID && item.playerName === playerName))
	if (index != -1) {
		players[index].count = players[index].count + 1
	} else {
		players.push({ steamID: steamID, playerName: playerName, count: 1 })
	}
}

const getSteamInfo = async (steamIDs) => {
	let value;
	const requestOptions = {
		method: "GET",
		redirect: "follow",
	};
	let url = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?steamids=${steamIDs}&key=${SteamApiKey}`;

	try {
		const response = await fetch(url, requestOptions);
		if (response.ok) {
			value = await response.json();
		} else {
			console.error(response.statusText)
		}
	} catch (error) {
		console.error(error)
	}
	return value.response.players;
};

for (const log of logs) {
	const content = fs.readFileSync(log, { encoding: 'utf8', flag: 'r' })
	const lines = content.split("\n")
	let steamID;
	let playerName;
	let lineCount;
	for (const line of lines) {
		if (line.includes("SteamID")) {
			lineCount = 0
			steamID = line.match(regexSteamID)[1].trim()
		}
		if (steamID && line.includes("ZDOID") && lineCount < maxLines) {
			const playerIndex = line.match(regexPlayerIndex)
			if (playerIndex <= maxPlayerIndex && playerIndex > 0) {
				playerName = line.match(regexPlayerName)[1].trim()
				pushCombo(steamID, playerName)
			}
		}
		if (steamID && playerName || lineCount > maxLines) {
			steamID = undefined;
			playerName = undefined;
		}
		lineCount++
	}
}

let steamIDSet = new Set
for (const combo of players) {
	steamIDSet.add(combo.steamID)
}
const steamIDs = Array.from(steamIDSet)

const steaminfo = await getSteamInfo(steamIDs)

for (const combo of players) {
	const steamPlayer = steaminfo.find(item => item.steamid === combo.steamID)
	combo.steamName = steamPlayer.personaname
}

const filteredPlayers = [];
players.sort((a,b) => b.count - a.count)
for (let index = 0; index < players.length; index++) {
	const element = players[index];
	const duplicates = players.filter(item => item.steamID === players[index].steamID)
	if (filteredPlayers.findIndex(item => item.steamID === players[index].steamID) === -1){
		filteredPlayers.push(duplicates[0])
	}
}

final.push("```")
final.push("SteamID            Player Name      Confidence  Steam Name")
for (const combo of filteredPlayers) {
	final.push(`${combo.steamID}  ${combo.playerName.padEnd(16).substring(0, 15)}  ${combo.count.toString().padEnd(10)}  ${combo.steamName.padEnd(16).substring(0, 15)} `)
}
final.push("```")
fs.writeFileSync("players.txt", final.join("\n"), { encoding: 'utf8', flag: 'w' })
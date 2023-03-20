var cgs_global;  // global source of truth for cgs
var update_cgs = true;  // whether to fetch cgs next time
var loaded_once = false;  // whether it was ever able to fetch json from server


async function update_cgs_global() {
    let response;
    let status;
    let max_tries = 5;

    while ((status != 200) && (max_tries > 0)) {
        response = await fetch("https://krunk.infinitifall.net/scripts/custom-games.json");
        status = response.status;
        max_tries -= 1;
    }

    if (status == 200) {
        cgs_global = await response.json();

        if (!loaded_once) {
            loaded_once = true;
        }
    } else {
        let table = document.getElementById("cgs");
        table.innerHTML = "Something went wrong, try <a href='javascript:window.location.reload(true)'>reloading the page</a>";
    }
}


/**
 * Function that sets update_cgs to true once every few seconds, signalling that
 * cgs_global can be updated the next time a button is pressed
 */
function timeout_fetching_cgs() {
    update_cgs = true;
    setTimeout(timeout_fetching_cgs, 10000);
}


function set_table_loading() {
    let table = document.getElementById("cgs");
    table.innerHTML = "Loading...";
}


/**
 * Populate table with custom games
 * 
 * @param {All custom games} cgs 
 */
function populate_table(cgs) {
    let table = document.getElementById("cgs");
    table.innerHTML = "";

    let first_full = false;
    let fist_non_empty = false;

    for (let i = 0; i < cgs.length; i++) {
        let cg = cgs[i];
        
        // if starred custom game create a new row and populate it with custom game data
        if (!("star" in cg)) { continue; }

        let row = table.insertRow(-1);
        let cells = new Array(5);
        for (let j = 0; j < cells.length; j++) { cells[j] = row.insertCell(j); }
        
        let cg_link = "<a target='_blank' href=" + "https://krunker.io/?game=" + cg.link + ">";
        
        let start = "";
        let end = ""
        if ("full" in cg) {
            start = "<span class='wrapper-cg-full'>";
            end = "</span>"
            
            if (!first_full) {
                let row_message = document.createElement("tr");
                row_message.className = "cgs-table-message";
                row.parentNode.insertBefore(row_message, row);

                let cell = row_message.insertCell(0);
                cell.colSpan = 50;
                cell.innerHTML = "Full lobbies";

                first_full = true;
            }

        } else if ("non_empty" in cg) {
            start = "<span class='wrapper-cg-non-empty'>";
            end = "</span>"

            if (!fist_non_empty) {
                let row_message = document.createElement("tr");
                row_message.className = "cgs-table-message";
                row.parentNode.insertBefore(row_message, row);

                let cell = row_message.insertCell(0);
                cell.colSpan = 50;
                cell.innerHTML = "Repeat lobbies";

                fist_non_empty = true;
            }
        }

        // mode
        cells[0].innerHTML = start + cg_link + "<span class='cg-mode-" + cg.mode_type + "'>" + cg.mode + "</span>" + "</a>" + end;
        
        // map name
        let cells_1_innerhtml = cg_link + "<span class='cg-map";
        if ("full" in cg) { cells_1_innerhtml += "-full"; }
        else if ("non_empty" in cg) { cells_1_innerhtml += "-non-empty"; }
        else if ("repeated" in cg) { cells_1_innerhtml += "-repeated"; }
        cells_1_innerhtml += "'>" + cg.map.replace(/[^\x00-\x7F]/g, "") + "</span>" + "</a>";
        cells[1].innerHTML = start + cells_1_innerhtml + end;
        
        // region
        cells[2].innerHTML = start + cg_link + "<span class='cg-region-" + cg.region_group + "'>" + cg.region + "</span>" + "</a>" + end;
        
        // players
        cells[3].innerHTML = start + cg_link + "<span class='cg-players'>" + "&nbsp;".repeat(2 - cg.players.toString().length) + cg.players.toString() + "/" + cg.total.toString() + "</span>" + "</a>" + end;
        
        //special property
        let cells_4_innerhtml = "";
        if ("password" in cg) { cells_4_innerhtml = "🔒" }
        else if ("verified" in cg) { cells_4_innerhtml = "💙"}
        else if ("dedicated" in cg) { cells_4_innerhtml = "★" }
        cells[4].innerHTML = start + cells_4_innerhtml + end;
    }

    populate_stats(cgs);
}


/**
 * Populate div with custom game stats
 * 
 * @param {All custom games} cgs 
 */
function populate_stats(cgs) {
    let table_parent = document.getElementById("cgs-stats-grandparent");

    // delete old stats
    let old_stats = document.getElementsByClassName("cgs-stats-parent");
    while(old_stats.length > 0){
        old_stats[0].parentNode.removeChild(old_stats[0]);
    }

    let cgs_stats = get_cgs_stats(cgs);

    let div_parent = document.createElement("div");
    div_parent.className = "cgs-stats-parent";
    let divs = new Array();
    for (let i = 0; i < 4; i++) {
        divs[i] = document.createElement("div");
        divs[i].className = "cgs-stats";
    }

    divs[0].innerHTML = "Players online: " + cgs_stats.player_stats.players.toString();
    divs[1].innerHTML = "Lobbies: " + cgs.length.toString();
    divs[2].innerHTML = "Unique maps: " + Object.keys(cgs_stats.map_stats).length.toString();
    // divs[3].innerHTML = "Vacancies: " + (cgs_stats.tcount - cgs_stats.pcount).toString();
    
    table_parent.appendChild(div_parent);
    for (let i = 0; i < 3; i++) {
        div_parent.appendChild(divs[i])
    }
}

/**
 * Return overall stats for all custom games
 * 
 * @param {All custom games} cgs
 */
function get_cgs_stats(cgs){
    
    let mode_stats = new Object();
    let mode_type_stats = new Object();
    let region_stats = new Object();
    let region_group_stats = new Object();
    let player_stats = new Object();
    let map_stats = new Object();

    player_stats.players = 0;
    player_stats.total = 0;
    
    for (let i = 0; i < cgs.length; i++) {
        let cg = cgs[i];

        player_stats.players += cg.players;
        player_stats.total += cg.total;

        // ignore empty maps
        if (cg.players == 0) { continue; }
    
        if (!(cg.map in map_stats)) { map_stats[cg.map] = 1; }
        else { map_stats[cg.map] += 1; }

        if (!(cg.mode in mode_stats)) { mode_stats[cg.mode] = 1; }
        else { mode_stats[cg.mode] += 1; }

        if (!(cg.mode_type in mode_type_stats)) { mode_type_stats[cg.mode_type] = 1; }
        else { mode_type_stats[cg.mode_type] += 1; }

        if (!(cg.region_group in region_group_stats)) { region_group_stats[cg.region_group] = 1; }
        else { region_group_stats[cg.region_group] += 1; }

        if (!(cg.region in region_stats)) { region_stats[cg.region] = 1;}
        else { region_stats[cg.region] += 1; }
    }

    return {
        "mode_stats": mode_stats,
        "mode_type_stats": mode_type_stats,
        "region_stats": region_stats,
        "region_group_stats": region_group_stats,
        "player_stats": player_stats,
        "map_stats": map_stats
    }
}

/**
 * Function to compare two custom games for sorting
 * 
 * @param {First custom game} a 
 * @param {Second custom game} b 
 * @param {All custom games} cgs
 */
function compare_cgs(a, b, cgs) {
    let cgs_stats = get_cgs_stats(cgs);

    // const acceptable_player_ratio = 0.8;
    // if (
    //     (a.players != b.players) &&
    //     (
    //         ((a.players / b.players) <= acceptable_player_ratio) ||
    //         ((b.players / a.players) <= acceptable_player_ratio)
    //     )
    // ) {

    if (
        ((a.players != b.players) && (a.players > 20 || b.players > 20)) ||
        ((a.players <= 20 && a.players > 16 && b.players < 16) || (b.players <= 20 && b.players > 16 && a.players < 16)) ||
        ((a.players <= 16 && a.players > 10 && b.players < 10) || (b.players <= 16 && b.players > 10 && a.players < 10)) ||
        ((a.players <= 10 && a.players > 6 && b.players < 6) || (b.players <= 10 && b.players > 6 && a.players < 6)) ||
        ((a.players != b.players) && (a.players <= 6 || b.players <= 6))
    ) {
        return b.players - a.players;

    } else if (a.mode_type !== b.mode_type) {
        // less popular mode types on top
        if ((cgs_stats.mode_type_stats[a.mode_type] != cgs_stats.mode_type_stats[b.mode_type])) {
            return cgs_stats.mode_type_stats[a.mode_type] - cgs_stats.mode_type_stats[b.mode_type];
        }

        return a.mode_type.localeCompare(b.mode_type);
        

    } else if (
        (a.region_group !== b.region_group) &&
        (a.regions_group_preference != b.regions_group_preference)
    ) {
        // more preferred region group on top
        return b.regions_group_preference - a.regions_group_preference;
    
    } else if (
        (a.region_group !== b.region_group) &&
        (cgs_stats.region_stats[a.region] != cgs_stats.region_stats[b.region])
    ) {
        // more popular region on top
        return cgs_stats.region_stats[b.region] - cgs_stats.region_stats[a.region];

    } else if (cgs_stats.mode_stats[a.mode] != cgs_stats.mode_stats[b.mode]) {
        // less popular modes on top
        return cgs_stats.mode_stats[a.mode] - cgs_stats.mode_stats[b.mode];

    } else if (a.mode !== b.mode) {
        // alphabetical ordering of modes
        return a.mode.localeCompare(b.mode);
        
    } else if (b.total != a.total) {
        // higher total on top
        return b.total - a.total;
    }

    return 0;
}


/**
 * Another function to compare two custom games for sorting
 * 
 * @param {First custom game} a 
 * @param {Second custom game} b
 */
function compare_cgs_2(a, b) {

    if (b.map !== a.map) {
        return a.map.localeCompare(b.map);

    } else if (a.region_group !== b.region_group) {
        return a.region_group.localeCompare(b.region_group);

    } else if (a.mode_type !== b.mode_type) {
        return a.mode_type.localeCompare(b.mode_type);

    } else if (a.mode !== b.mode) {
        return a.mode.localeCompare(b.mode);
    }
    
    return 0;
}


/**
 * Polishes the cgs to make it more human friendly
 * 
 * @param {All custom games in raw original format} cgs
 * @param {Whitelisted mode type (empty for no whitelist)} mode_type
 * @param {Whitelisted region group (empty for no whitelist)} region_group
 */
function polish_cgs(cgs, mode_type, region_group) {

    //  region / short / regions_group index / preference (used for lucky only)
    const regions_global = {
        "MIA":  ["US East",     0,      10],
        "NY":   ["US East",     0,      10],
        "SV":   ["US West",     1,      9],
        "DAL":  ["US South",    0,      8],
        "CHI":  ["US Mid",      0,      8],
        "STL":  ["US Mid",      0,      8],
        "HI":   ["US West",     1,      1],
        "FRA":  ["Europe",      2,      15],
        "LON":  ["Europe",      2,      7],
        "SIN":  ["Asia",        3,      10],
        "TOK":  ["Asia",        3,      3],
        "SEO":  ["Asia",        3,      3],
        "SYD":  ["Australia",   4,      7],
        "BLR":  ["India",       5,      6],
        "BRZ":  ["Brazil",      6,      5],
        "MX":   ["Mexico",      7,      2],
        "AFR":  ["Africa",      8,      1],
        "BHN":  ["Arabia",      9,      1]
    };

    //  region_group / preference (used for ordering)
    const regions_group = [
        ["us-east",     10],
        ["us-west",     8],
        ["eu",          11],
        ["asia",        9],
        ["au",          7],
        ["ind",         6],
        ["brz",         6],
        ["mx",          4],
        ["afr",         4],
        ["arab",        4],
    ]

    //  id / name / modes_types index
    const modes_global = {
        0:  ["ffa",     3],
        1:  ["tdm",     2],
        2:  ["point",   2],
        3:  ["ctf",     2],
        4:  ["bhop",    0],
        5:  ["hide",    4],
        6:  ["infect",  1],
        7:  ["race",    4],
        8:  ["lms",     3],
        9:  ["simon",   4], 
        10: ["gun",     3],
        11: ["prop",    4],
        12: ["boss",    4],
        13: ["clas",    3],
        14: ["dep",     2],
        15: ["stalk",   4],
        16: ["koth",    3],
        17: ["oitc",    3],
        18: ["trade",   5],
        19: ["kc",      2], 
        20: ["de",      2],
        21: ["sharp",   3],
        22: ["traitor", 4],
        23: ["raid",    6],
        24: ["blitz",   2],
        25: ["dom",     2],
        26: ["sdm",     2],
        27: ["kranked", 3],
        28: ["tdf",     2],
        29: ["dep_ffa", 3], 
        33: ["chs",     3],
        34: ["bhffa",   3],
        35: ["zom",     6]
    };

    const modes_types_global = [
        "bhop",
        "infect",
        "team",
        "solo",
        "fun",
        "trade",
        "bots"
    ]

    let cgs_local = new Array();

    for (let i = 0; i < cgs.games.length; i++) {
        let cg = cgs.games[i];
        let custom_game = new Object();

        // ignore pubs
        if (cg[4].c == 0) { continue; }

        custom_game.players = cg[2];
        custom_game.total = cg[3];
        custom_game.map = cg[4].i;
        custom_game.link = cg[0];

        let region = cg[0].split(":")[0];
        if (region in regions_global) {
            custom_game.region = regions_global[region][0];
            custom_game.region_preference = regions_global[region][2];
            custom_game.region_group = regions_group[regions_global[region][1]][0];
            custom_game.regions_group_preference = regions_group[regions_global[region][1]][1];
            
            if (region_group !== undefined) {
                if (custom_game.region_group !== region_group) {
                    continue;
                }
            }

        } else if (region_group === undefined) {
            custom_game.region = region;
            custom_game.region_preference = 0;
            custom_game.region_group = "";
            custom_game.regions_group_preference = 0;
        } else {
            continue;
        }

        if (cg[4].g in modes_global) {
            custom_game.mode = modes_global[cg[4].g][0];
            custom_game.mode_type = modes_types_global[modes_global[cg[4].g][1]];
            
            if (mode_type !== undefined) {
                if (custom_game.mode_type !== mode_type) {
                    continue;
                }
            }
            
        } else if (mode_type === undefined) {
            custom_game.mode = "???";
            custom_game.mode_type = "";

        } else {
            continue;
        }

        if ("ds" in cg[4]) { custom_game.dedicated = cg[4].ds; }
        if ("pw" in cg[4]) { custom_game.password = cg[4].ds; }
        if (custom_game.total > 16 && custom_game.total < 40) { custom_game.verified = 1; }
        cgs_local.push(custom_game);
    }

    return cgs_local;
}


/**
 * Sort and filter through custom games, tagging them as required
 * 
 * @param {All custom games} cgs
 * @param {Whitelisted mode types (empty for no whitelist)} mode_type
 * @param {Whitelisted region group (empty for no whitelist)} region_group
 */
function sort_cgs(cgs, mode_type, region_group) {
    let cgs_local = polish_cgs(cgs, mode_type, region_group);
    // mode_type and region_group are ideally not used after this

    // sort custom games according to popularity and group by common properties
    cgs_local.sort((a, b) => compare_cgs(a, b, cgs_local));

    // show all unique non full maps
    let cg_maps = new Set();
    let cg_maps_not_full = new Object();

    for (let i = 0; i < cgs_local.length; i++) {
        let cg = cgs_local[i];

        if (!cg_maps.has(cg.map)) {
            cg_maps.add(cg.map);
            if (cg.players < cg.total) {
                cg_maps_not_full[cg.map] = 1;
                cg.unique_non_empty = 1;
                cg.star = 1;
            } else {
                // nothing
            }
        } else if (!(cg.map in cg_maps_not_full)) {
            if (cg.players < cg.total) {
                cg_maps_not_full[cg.map] = 1;
                cg.unique = 1;
                cg.star = 1;
            }
        }
    }

    let cgs_local_2 = new Array();

    // populate cgs_local_2 with star maps and
    // show repeats only if they meet a strict criteria
    let repeats_allowed = 10;
    let repeats_min_player_ratio = 0.4;
    // let repeats_min_players = 4;

    for (let i = 0; i < cgs_local.length; i++) {
        let cg = cgs_local[i];

        if (!("star" in cg)) { continue; }
        if ("done" in cg) { continue; }

        cgs_local_2.push(cg);

        // make sure at least one of mode or region is unique for lobbies of the same map
        // before considering them for repeats
        // let mode_regions = new Set();
        // mode_regions.add(cg.mode + "_" + cg.region_group);

        // as an alternative to mode_regions, use only region (since most maps have cyclic modes)
        // don't ponder so much over maps which have multiple lobbies
        let only_regions = new Set();
        only_regions.add(cg.region_group);
        
        let repeat_count = 0;
        for (let j = 0; j < cgs_local.length; j++) {
            let cg_2 = cgs_local[j];

            if (i == j) { continue; }
            if ("done" in cg_2) { continue; }

            if (cg.map == cg_2.map) {
                // if (mode_regions.has(cg_2.mode + "_" + cg_2.region_group)) {
                //     cg_2.done = 1;
                //     continue;
                // }

                if (only_regions.has(cg_2.region_group)) {
                    cg_2.done = 1;
                    continue;
                }
                
                if (
                    (cg_2.players < cg_2.total) && 
                    // (cg_2.players >= repeats_min_players) && 
                    ((cg_2.players / cg.players) >= repeats_min_player_ratio) && 
                    (repeat_count < repeats_allowed)
                ) {
                    cg_2.star = 1;
                    cg_2.done = 1;
                    cg_2.repeated = 1;
                    cgs_local_2.push(cg_2);

                    // mode_regions.add(cg_2.mode + "_" + cg_2.region_group);
                    only_regions.add(cg_2.region_group);
                    repeat_count += 1;
                }
            }
        }
    }

    // tag all full games and populate cgs_local_2 with them (at the end of the array)
    // here we don't care about their popularity, only of grouping by map name
    cgs_local.sort((a, b) => compare_cgs_2(a, b, cgs_local));
    
    for (let i = 0; i < cgs_local.length; i++) {
        let cg = cgs_local[i];

        if (cg.players == cg.total) {
            cg.star = 1;
            cg.full = 1;
            cgs_local_2.push(cg);
        }
    }

    // push all the non starred lobbies to cgs_local_2 too
    // tag the ones that are non empty
    for (let i = 0; i < cgs_local.length; i++) {
        let cg = cgs_local[i];

        if (!("star" in cg)) {
            if (cg.players > 0) {
                cg.star = 1;
                cg.non_empty = 1;
            }
            cgs_local_2.push(cg);
        }
    }

    return cgs_local_2;
}


/**
 * Wrapper to populate table with custom games from all modes
 * 
 * @param {Whitelisted mode types (empty for no whitelist)} mode_type
 * @param {Whitelisted region group (empty for no whitelist)} region_group
 */
async function populate_wrapper(mode_type, region_group) {

    // update cgs_global if update_cgs flag is set to true
    if (update_cgs) {
        set_table_loading();
        await update_cgs_global();
        update_cgs = false;
    }

    let cgs_local = sort_cgs(cgs_global, mode_type, region_group);
    populate_table(cgs_local);
}


/**
 * Wrapper to quick join a game
 * 
 * @param {Whitelisted mode types (empty for no whitelist)} mode_type
 * @param {Whitelisted mode types (empty for no whitelist)} region_group
 * @param {Whitelisted region group (empty for no whitelist)} region_group
 */
async function lucky_wrapper(mode_type, region_group) {

    // update cgs_global every time (don't want to redirect players into a full game!)
    await update_cgs_global();
    
    let cgs_local = sort_cgs(cgs_global, mode_type, region_group);
    let starred_count = 0;
    let lucky_min_players = 4;

    for (let i = 0; i < cgs_local.length; i++) {
        let cg = cgs_local[i];

        if (
            ("unique_non_empty" in cg) &&
            (cg.players > lucky_min_players)
        ) {
            starred_count += cg.region_preference;
        }
    }

    if (starred_count == 0) {
        return undefined;
    }

    let lucky_index = Math.random() * starred_count;
    let lucky_link;

    for (let i = 0; i < cgs_local.length; i++) {
        let cg = cgs_local[i];

        if (lucky_index <= cg.region_preference) {
            lucky_link = "https://krunker.io/?game=" + cg.link;
            break;
        }

        if (
            ("unique_non_empty" in cg) &&
            (cg.players > lucky_min_players)
        ) {
            lucky_index -= cg.region_preference;
        }
    }

    return lucky_link;
}


/**
 * Wrapper around a wrapper to quick join a game
 * 
 * @param {Whitelist a gamemode type} mode_type
 * @param {Whitelisted region group (empty for no whitelist)} region_group
 * @param {self element} self
 */
async function lucky_wrapper_2(mode_type, region_group, self) {
    let old_state = self.innerHTML;
    self.innerHTML = "⏳";
    let lucky_link = await lucky_wrapper(mode_type, region_group);
    if (lucky_link === undefined) {
        self.innerHTML = "❌";

    } else {
        self.innerHTML = "✅";
        window.open(lucky_link, '_blank').focus();

    }
    
    setTimeout(function() {
        self.innerHTML = old_state;
    }, 2000); 
}


async function main() {
    populate_wrapper();
    timeout_fetching_cgs();
}

main();

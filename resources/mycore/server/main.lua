local activePlayers = {}

-- Identifiers Hilfsfunktion
local function GetIdentifiers(src)
    local ids = {license = nil, steam = nil, discord = nil}
    for i = 0, GetNumPlayerIdentifiers(src) - 1 do
        local id = GetPlayerIdentifier(src, i)
        if string.find(id, "license:") then ids.license = id
        elseif string.find(id, "steam:") then ids.steam = id
        elseif string.find(id, "discord:") then ids.discord = id end
    end
    return ids
end

-- ==========================================
-- CHARAKTER LOGIK & DB
-- ==========================================

RegisterNetEvent('core:getCharacters', function()
    local src = source
    local ids = GetIdentifiers(src)
    if ids.license then
        MySQL.query('SELECT * FROM players WHERE license = ?', {ids.license}, function(res)
            TriggerClientEvent('core:showSelectionUI', src, res or {})
        end)
    end
end)

RegisterNetEvent('core:saveNewCharacter', function(data)
    local src = source
    local ids = GetIdentifiers(src)
    local cid = "CID" .. math.random(10000, 99999)
    local startPos = json.encode({ x = -1037.42, y = -2737.52, z = 20.17, health = 200, armor = 0 })

    MySQL.insert([[
        INSERT INTO players (license, steam, discord, citizenid, firstname, lastname, birthdate, position) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ]], {ids.license, ids.steam or "n/a", ids.discord or "n/a", cid, data.firstname, data.lastname, data.birthdate, startPos}, 
    function(id)
        if id then TriggerClientEvent('core:startCreator', src, cid, data.firstname, data.lastname) end
    end)
end)

RegisterNetEvent('core:deleteCharacter', function(cid)
    local src = source
    local ids = GetIdentifiers(src)
    MySQL.query('DELETE FROM players WHERE citizenid = ?', {cid}, function()
        MySQL.query('SELECT * FROM players WHERE license = ?', {ids.license}, function(res)
            TriggerClientEvent('core:showSelectionUI', src, res or {})
        end)
    end)
end)

RegisterNetEvent('core:finalizeCharacter', function(cid, skin)
    MySQL.update('UPDATE players SET skin = ? WHERE citizenid = ?', {json.encode(skin), cid})
end)

-- ==========================================
-- SPIELZEIT & CACHE SYSTEM
-- ==========================================

RegisterNetEvent('core:setPlayerActive', function(cid, fname, lname)
    local src = source
    MySQL.query('SELECT playtime, first_join FROM players WHERE citizenid = ?', {cid}, function(result)
        local dbData = result[1]
        activePlayers[src] = { 
            source = src,
            cid = cid, 
            firstname = fname or "Unbekannt", 
            lastname = lname or "Spieler",
            status = { health = 200, armor = 0, x = 0, y = 0, z = 0 },
            playtime = dbData and dbData.playtime or 0,
            first_join = dbData and dbData.first_join or "Unbekannt",
            sessionStart = os.time()
        }
        print("^2[Core]^7 " .. fname .. " (ID: " .. src .. ") registriert mit " .. (activePlayers[src].playtime) .. "s Spielzeit.")
    end)
end)

local function SavePlayerTime(src)
    local data = activePlayers[src]
    if data and data.sessionStart then
        local currentTime = os.time()
        local sessionDuration = currentTime - data.sessionStart
        data.playtime = data.playtime + sessionDuration
        MySQL.update('UPDATE players SET playtime = ? WHERE citizenid = ?', {data.playtime, data.cid})
        data.sessionStart = currentTime
    end
end

-- ==========================================
-- ADMIN & SYNC LOGIK
-- ==========================================

RegisterNetEvent('core:requestPlayerList', function()
    local src = source
    if not activePlayers[src] then TriggerClientEvent('core:reRegisterRequest', src) Wait(300) end
    
    local playerList = {}
    for playerId, data in pairs(activePlayers) do table.insert(playerList, data) end
    TriggerClientEvent('core:receivePlayerList', src, playerList)
end)

RegisterNetEvent('core:adminActionOnTarget', function(targetSrc, action)
    local src = source
    local target = tonumber(targetSrc)
    if not target or not activePlayers[target] then return end

    if action == "kick" then
        DropPlayer(target, "Du wurdest gekickt.")
    else
        -- Aktion ausführen
        TriggerClientEvent('core:executeTargetAction', target, action)
        
        -- Sofort-Update im Server-Cache für den Admin-Sync
        if action == "heal" or action == "revive" then activePlayers[target].status.health = 200
        elseif action == "armor" then activePlayers[target].status.armor = 100 end

        -- Liste sofort neu an den Admin senden
        local playerList = {}
        for playerId, data in pairs(activePlayers) do table.insert(playerList, data) end
        TriggerClientEvent('core:receivePlayerList', src, playerList)
    end
end)

RegisterNetEvent('core:pingStatus', function(coords, health, armor)
    local src = source
    if activePlayers[src] then
        activePlayers[src].status = { x = coords.x, y = coords.y, z = coords.z, health = health, armor = armor }
    end
end)

-- ==========================================
-- AUTO-SAVE SCHLEIFE
-- ==========================================
CreateThread(function()
    while true do
        Wait(60000)
        for src, data in pairs(activePlayers) do
            if data.cid then
                SavePlayerTime(src)
                if data.status then
                    MySQL.update('UPDATE players SET position = ? WHERE citizenid = ?', {json.encode(data.status), data.cid})
                end
            end
        end
    end
end)

AddEventHandler('playerDropped', function(reason)
    local src = source
    if activePlayers[src] then
        SavePlayerTime(src)
        if activePlayers[src].status then
            MySQL.update('UPDATE players SET position = ? WHERE citizenid = ?', {json.encode(activePlayers[src].status), activePlayers[src].cid})
        end
    end
    activePlayers[src] = nil
end)

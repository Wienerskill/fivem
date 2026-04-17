local currentCID = nil
local charFname = "" 
local charLname = "" 
local isStarted = false
local invOpen = false  -- Für Inventar Toggle
local lastInvToggle = 0  -- Cooldown für F2

-- ==========================================
-- 1. HUD & CACHE LOOPS
-- ==========================================
CreateThread(function()
    DisplayRadar(false)
    SetPlayerHealthRechargeMultiplier(PlayerId(), 0.0)

    while true do
        Wait(200)
        local ped = PlayerPedId()
        
        local health = GetEntityHealth(ped) - 100
        if health < 0 then health = 0 end
        if health > 100 then health = 100 end
        
        local armor = GetPedArmour(ped)
        
        SendNUIMessage({
            action = "updateHUD",
            health = health,
            armor = armor
        })
    end
end)

CreateThread(function()
    while true do
        Wait(5000)
        if currentCID then
            local ped = PlayerPedId()
            local coords = GetEntityCoords(ped)
            
            if coords.z > -150.0 then 
                local health = GetEntityHealth(ped)
                local armor = GetPedArmour(ped)
                TriggerServerEvent('core:pingStatus', coords, health, armor)
            end
        end
    end
end)

-- ==========================================
-- 2. START & CHARAKTER AUSWAHL
-- ==========================================
function ForceCoreStart()
    if isStarted then return end
    isStarted = true
    ShutdownLoadingScreen()
    ShutdownLoadingScreenNui()
    TriggerServerEvent('core:getCharacters')
end

CreateThread(function()
    while true do
        Wait(500)
        if NetworkIsPlayerActive(PlayerId()) then
            ForceCoreStart()
            break
        end
    end
end)

RegisterNetEvent('core:showSelectionUI', function(chars)
    local ped = PlayerPedId()
    SetEntityVisible(ped, false, false)
    FreezeEntityPosition(ped, true)
    SetNuiFocus(true, true)
    SendNUIMessage({ action = "openSelection", chars = chars, maxChars = 3 })
end)

RegisterNetEvent('core:startCreator', function(cid, fname, lname)
    currentCID = cid
    charFname = fname or "Neu"
    charLname = lname or "Erstellt"
    
    local ped = PlayerPedId()
    SendNUIMessage({ action = "openCreator" })
    
    SetEntityVisible(ped, true, false)
    FreezeEntityPosition(ped, true)
    
    SetEntityCoordsNoOffset(ped, -1037.42, -2737.52, 20.17, false, false, false)
    SetEntityHeading(ped, 20.0)

    local model = `mp_m_freemode_01`
    RequestModel(model)
    while not HasModelLoaded(model) do Wait(0) end
    SetPlayerModel(PlayerId(), model)
    SetPedDefaultComponentVariation(PlayerPedId())

    SetEntityHealth(PlayerPedId(), 200)
    SetPedArmour(PlayerPedId(), 0)

    PrepareCreatorCamera(true)
    RefreshVisualLimits()
end)

RegisterNUICallback('saveNewCharacter', function(data, cb)
    TriggerServerEvent('core:saveNewCharacter', data)
    cb('ok')
end)

RegisterNUICallback('saveCharacterDesign', function(data, cb)
    local skinData = GetCurrentSkinData()
    TriggerServerEvent('core:finalizeCharacter', currentCID, skinData)
    
    DoScreenFadeOut(500)
    Wait(500)
    
    local ped = PlayerPedId()
    PrepareCreatorCamera(false)
    SetNuiFocus(false, false)
    FreezeEntityPosition(ped, false)
    
    -- WICHTIG: Namen an Server senden
    TriggerServerEvent('core:setPlayerActive', currentCID, charFname, charLname)
    
    local coords = GetEntityCoords(ped)
    TriggerServerEvent('core:pingStatus', coords, 200, 0)
    
    Wait(500)
    DoScreenFadeIn(1000)
    cb('ok')
end)

RegisterNUICallback('selectChar', function(data, cb)
    local char = data.char
    currentCID = char.citizenid
    
    local skin = json.decode(char.skin)
    local pos = json.decode(char.position)
    
    DoScreenFadeOut(500)
    Wait(500)
    
    SetNuiFocus(false, false)
    
    if skin and skin.model then
        RequestModel(skin.model)
        while not HasModelLoaded(skin.model) do Wait(0) end
        SetPlayerModel(PlayerId(), skin.model)
        Wait(100)
        ApplySkin(skin)
    end
    
    local ped = PlayerPedId()
    SetEntityVisible(ped, true, false)
    
    if pos and pos.x and pos.y and pos.z then
        FreezeEntityPosition(ped, true)
        SetEntityCoordsNoOffset(ped, pos.x, pos.y, pos.z, false, false, false)
        SetEntityHealth(ped, pos.health or 200)
        SetPedArmour(ped, pos.armor or 0)
        
        RequestCollisionAtCoord(pos.x, pos.y, pos.z)
        local timer = GetGameTimer()
        while not HasCollisionLoadedAroundEntity(ped) and GetGameTimer() - timer < 3000 do
            Wait(0)
        end
        FreezeEntityPosition(ped, false)
    else
        FreezeEntityPosition(ped, false)
    end
    
    -- WICHTIG: Namen an Server senden
    TriggerServerEvent('core:setPlayerActive', currentCID, char.firstname, char.lastname)
    
    Wait(500)
    DoScreenFadeIn(1000)
    cb('ok')
end)

RegisterNUICallback('deleteChar', function(data, cb)
    TriggerServerEvent('core:deleteCharacter', data.citizenid)
    cb('ok')
end)

RegisterNetEvent('core:reRegisterRequest', function()
    if currentCID then
        -- Wenn wir eingeloggt sind, schicken wir unsere Daten einfach nochmal hoch
        TriggerServerEvent('core:setPlayerActive', currentCID, charFname, charLname)
    end
end)

-- ==========================================
-- INVENTAR SYSTEM
-- ==========================================

-- F2 für Inventar
RegisterKeyMapping('openinventory', 'Inventar öffnen/schließen', 'keyboard', 'F2')
RegisterCommand('openinventory', function()
    local now = GetGameTimer()
    if now - lastInvToggle < 500 then return end  -- Cooldown 500ms
    lastInvToggle = now
    if invOpen then
        TriggerServerEvent('closeInventory')
    else
        TriggerServerEvent('openInventory')
    end
end, false)

-- UI Events
RegisterNetEvent('toggleInventory', function(state, data)
    if state then
        invOpen = true
        SendNUIMessage({
            action = "toggleInventory",
            state = true,
            items = data.items,
            currentWeight = data.currentWeight,
            maxWeight = data.maxWeight,
            maxSlots = data.maxSlots
        })
        SetNuiFocus(true, true)
    else
        invOpen = false
        SendNUIMessage({
            action = "toggleInventory",
            state = false
        })
        SetNuiFocus(false, false)
    end
end)

RegisterNetEvent('updateInventory', function(data)
    if invOpen then
        SendNUIMessage({
            action = "updateInventory",
            items = data.items,
            currentWeight = data.currentWeight,
            maxWeight = data.maxWeight,
            maxSlots = data.maxSlots
        })
    end
end)

-- NUI Callbacks
RegisterNUICallback('moveItem', function(data, cb)
    TriggerServerEvent('moveItem', data)
    cb('ok')
end)

RegisterNUICallback('closeInventory', function(data, cb)
    TriggerServerEvent('closeInventory')
    cb('ok')
end)

RegisterNUICallback('equipWeapon', function(data, cb)
    TriggerServerEvent('equipWeapon', data)
    cb('ok')
end)

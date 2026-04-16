local cam = nil
local camZ = 20.8
local currentSkin = { 
    model = `mp_m_freemode_01`, 
    face = 0, 
    skin = 0, 
    hair = 0, 
    hat = -1, 
    mask = 0, 
    tshirt = 0, 
    undershirt = 0, 
    arms = 0, 
    pants = 0, 
    shoes = 0 
}

function PrepareCreatorCamera(state)
    local ped = PlayerPedId()
    if state then
        camZ = 20.8
        cam = CreateCamWithParams("DEFAULT_SCRIPTED_CAMERA", -1039.5, -2739.5, camZ, 0.0, 0.0, 20.0, 40.0, false, 0)
        PointCamAtEntity(cam, ped, 0.0, 0.0, 0.0, true)
        SetCamActive(cam, true)
        RenderScriptCams(true, true, 1000, true, true)
    else
        RenderScriptCams(false, true, 1000, true, true)
        if cam and DoesCamExist(cam) then 
            DestroyCam(cam, false) 
        end
        cam = nil
    end
end

RegisterNUICallback('rotateCam', function(data, cb)
    local ped = PlayerPedId()
    
    if data.x then 
        local currentHeading = GetEntityHeading(ped)
        SetEntityHeading(ped, currentHeading + (data.x * -0.5)) 
    end
    
    if data.y and cam and DoesCamExist(cam) then
        camZ = math.max(20.2, math.min(21.5, camZ + (data.y * 0.005)))
        SetCamCoord(cam, -1039.5, -2739.5, camZ)
        PointCamAtEntity(cam, ped, 0.0, 0.0, 0.0, true)
    end
    cb('ok')
end)

function ApplySkin(d)
    local ped = PlayerPedId()
    SetPedHeadBlendData(ped, d.face or 0, d.face or 0, 0, d.skin or 0, d.skin or 0, 0, 1.0, 1.0, 0, false)
    SetPedComponentVariation(ped, 2, d.hair or 0, 0, 2)
    if d.hat and d.hat > -1 then
        SetPedPropIndex(ped, 0, d.hat, 0, true)
    else
        ClearPedProp(ped, 0)
    end
    SetPedComponentVariation(ped, 1, d.mask or 0, 0, 2)
    SetPedComponentVariation(ped, 11, d.tshirt or 0, 0, 2)
    SetPedComponentVariation(ped, 8, d.undershirt or 0, 0, 2)
    SetPedComponentVariation(ped, 3, d.arms or 0, 0, 2)
    SetPedComponentVariation(ped, 4, d.pants or 0, 0, 2)
    SetPedComponentVariation(ped, 6, d.shoes or 0, 0, 2)
end

function RefreshVisualLimits()
    local ped = PlayerPedId()
    SendNUIMessage({
        action = "updateLimits",
        limits = {
            face = 45,
            hair = GetNumberOfPedDrawableVariations(ped, 2),
            hat = GetNumberOfPedPropDrawableVariations(ped, 0),
            mask = GetNumberOfPedDrawableVariations(ped, 1),
            tshirt = GetNumberOfPedDrawableVariations(ped, 11),
            undershirt = GetNumberOfPedDrawableVariations(ped, 8),
            arms = GetNumberOfPedDrawableVariations(ped, 3),
            pants = GetNumberOfPedDrawableVariations(ped, 4),
            shoes = GetNumberOfPedDrawableVariations(ped, 6)
        }
    })
end

RegisterNUICallback('updateSkinPreview', function(data, cb)
    if data.type and data.value then
        currentSkin[data.type] = tonumber(data.value)
        ApplySkin(currentSkin)
    end
    cb('ok')
end)

RegisterNUICallback('updateGender', function(data, cb)
    local model = (data.gender == 'male' and `mp_m_freemode_01` or `mp_f_freemode_01`)
    RequestModel(model)
    while not HasModelLoaded(model) do Wait(0) end
    SetPlayerModel(PlayerId(), model)
    currentSkin.model = model
    
    currentSkin.face = 0 currentSkin.hair = 0 currentSkin.hat = -1 
    currentSkin.mask = 0 currentSkin.tshirt = 0 currentSkin.undershirt = 0 
    currentSkin.arms = 0 currentSkin.pants = 0 currentSkin.shoes = 0
    
    SetPedDefaultComponentVariation(PlayerPedId())
    RefreshVisualLimits()
    ApplySkin(currentSkin)
    cb('ok')
end)

function GetCurrentSkinData() 
    return currentSkin 
end

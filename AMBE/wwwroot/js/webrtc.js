/* SPIDEY_OS_v2.0_WEBRTC_CORE */
let localStream;
let pcs = {};
let dotNetHelper;

const config = {
    iceServers: [
        { urls: "stun:stun.relay.metered.ca:80" },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "2e7e778f6d1b07b279414c2d",
            credential: "MOO2Lssrfa/+i8LI",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "2e7e778f6d1b07b279414c2d",
            credential: "MOO2Lssrfa/+i8LI",
        }
    ],
    iceCandidatePoolSize: 10
};

window.prepareWebRTC = (helper) => { dotNetHelper = helper; };

window.spideyVibrate = (pattern) => { if (navigator.vibrate) navigator.vibrate(pattern); };

window.scrollToEnd = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
};

// Расширенная функция запуска потока (поддерживает только голос или видео+голос)
window.startLocalVideo = async (id, videoEnabled = true) => {
    try {
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
        }

        localStream = await navigator.mediaDevices.getUserMedia({
            video: videoEnabled ? { width: 640, height: 480, frameRate: 24 } : false,
            audio: true
        });

        const videoEl = document.getElementById(id);
        if (videoEl) {
            videoEl.srcObject = localStream;
            // Если только голос - добавляем визуальный эффект заглушки
            videoEl.style.opacity = videoEnabled ? "1" : "0.2";
        }
        return true;
    } catch (e) {
        console.error("Ошибка доступа к медиа:", e);
        return false;
    }
};

function getOrCreatePC(remoteId) {
    if (pcs[remoteId]) return pcs[remoteId];

    const pc = new RTCPeerConnection(config);
    pcs[remoteId] = pc;

    if (localStream) {
        localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    }

    pc.onicecandidate = (e) => {
        if (e.candidate && dotNetHelper) {
            dotNetHelper.invokeMethodAsync('SendSignalJS', JSON.stringify(e.candidate), remoteId).catch(() => { });
        }
    };

    pc.ontrack = (e) => {
        let container = document.getElementById("remoteVideos");
        let vSlot = document.getElementById("slot_" + remoteId);

        if (!vSlot) {
            // Создаем структуру как в игре (слот с декором)
            vSlot = document.createElement("div");
            vSlot.id = "slot_" + remoteId;
            vSlot.className = "v-slot remote-v-glitch";
            vSlot.innerHTML = `
                <video id="video_${remoteId}" autoplay playsinline></video>
                <div class="v-badge">АКТИВЕН</div>
                <div class="corner-decor top-left"></div>
                <div class="corner-decor bottom-right"></div>
            `;
            container.appendChild(vSlot);
        }

        const videoEl = document.getElementById("video_" + remoteId);
        if (videoEl) videoEl.srcObject = e.streams[0];
    };

    return pc;
}

window.createOfferGroup = async (id) => {
    const pc = getOrCreatePC(id);
    const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
    });
    await pc.setLocalDescription(offer);
    return JSON.stringify(offer);
};

window.processOfferGroup = async (json, id) => {
    const pc = getOrCreatePC(id);
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(json)));
    const ans = await pc.createAnswer();
    await pc.setLocalDescription(ans);
    return JSON.stringify(ans);
};

window.processAnswerGroup = async (json, id) => {
    if (pcs[id]) {
        await pcs[id].setRemoteDescription(new RTCSessionDescription(JSON.parse(json)));
    }
};

window.addIceCandidateGroup = async (json, id) => {
    if (pcs[id]) {
        await pcs[id].addIceCandidate(new RTCIceCandidate(JSON.parse(json))).catch(() => { });
    }
};

window.removeUser = (id) => {
    if (pcs[id]) {
        pcs[id].close();
        delete pcs[id];
        document.getElementById("slot_" + id)?.remove();
    }
};

window.hangup = () => {
    Object.keys(pcs).forEach(id => window.removeUser(id));
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
    const localVid = document.getElementById('localVideo');
    if (localVid) localVid.srcObject = null;
};

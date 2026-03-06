let localStream;
let pcs = {};
let dotNetHelper;

const config = {
    iceServers: [
        { urls: "stun:stun.relay.metered.ca:80" },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
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

window.toggleVideo = (enabled) => {
    if (localStream) {
        localStream.getVideoTracks().forEach(track => track.enabled = enabled);
    }
};

window.scrollToEnd = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollTop = el.scrollHeight;
};

window.startLocalVideo = async (id) => {
    try {
        if (localStream) localStream.getTracks().forEach(t => t.stop());
        localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, frameRate: 15 },
            audio: true
        });
        document.getElementById(id).srcObject = localStream;
        return true;
    } catch (e) { return false; }
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
            dotNetHelper.invokeMethodAsync('SendSignalJS', JSON.stringify(e.candidate), remoteId);
        }
    };

    pc.ontrack = (e) => {
        let container = document.getElementById("remoteVideos");
        let vSlot = document.getElementById("slot_" + remoteId);
        if (!vSlot) {
            vSlot = document.createElement("div");
            vSlot.id = "slot_" + remoteId;
            // ДРУГИЕ КЛИЕНТЫ: Большие прямоугольные окна
            vSlot.style = "flex: 1 1 200px; max-width: 100%; aspect-ratio: 16/9; background: #000; border: 1px solid #e62429; border-radius: 8px; overflow: hidden; position: relative;";
            vSlot.innerHTML = `<video id="video_${remoteId}" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>`;
            container.appendChild(vSlot);
        }
        document.getElementById("video_" + remoteId).srcObject = e.streams[0];
    };
    return pc;
}

window.createOfferGroup = async (id) => {
    const pc = getOrCreatePC(id);
    const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
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
    if (pcs[id]) await pcs[id].setRemoteDescription(new RTCSessionDescription(JSON.parse(json)));
};

window.addIceCandidateGroup = async (json, id) => {
    if (pcs[id]) await pcs[id].addIceCandidate(new RTCIceCandidate(JSON.parse(json))).catch(() => { });
};

window.removeUser = (id) => {
    if (pcs[id]) { pcs[id].close(); delete pcs[id]; document.getElementById("slot_" + id)?.remove(); }
};

window.hangup = () => {
    Object.keys(pcs).forEach(id => window.removeUser(id));
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    document.getElementById('localVideo').srcObject = null;
};

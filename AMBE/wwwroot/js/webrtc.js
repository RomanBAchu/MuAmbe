let localStream;
let peerConnections = {};
let dotNetHelper;

const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
            urls: ['turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'],
            username: 'openrelayproject', credential: 'openrelayproject'
        }
    ],
    iceCandidatePoolSize: 10
};

window.prepareWebRTC = async (helper) => {
    dotNetHelper = helper;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = localStream;
    } catch (e) { console.error("Camera error:", e); }
};

function createPC(remoteId) {
    if (peerConnections[remoteId]) return peerConnections[remoteId];

    const pc = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.onicecandidate = (e) => {
        if (e.candidate && dotNetHelper) {
            dotNetHelper.invokeMethodAsync('SendIceCandidate', JSON.stringify(e.candidate), remoteId);
        }
    };

    pc.ontrack = (e) => {
        for (let i = 1; i <= 3; i++) {
            let videoEl = document.getElementById(`remoteVideo${i}`);
            if (videoEl && (!videoEl.srcObject || videoEl.getAttribute("data-id") === remoteId)) {
                videoEl.srcObject = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
                videoEl.setAttribute("data-id", remoteId);
                break;
            }
        }
    };

    peerConnections[remoteId] = pc;
    return pc;
}

window.createOffer = async (remoteId) => {
    const pc = createPC(remoteId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return JSON.stringify(offer);
};

window.processOffer = async (offerJson, remoteId) => {
    const pc = createPC(remoteId);
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return JSON.stringify(answer);
};

window.processAnswer = async (ansJson, remoteId) => {
    const pc = peerConnections[remoteId];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(ansJson)));
};

window.addIceCandidate = async (candJson, remoteId) => {
    const pc = peerConnections[remoteId];
    if (!pc) return;
    try {
        const candidate = JSON.parse(candJson);
        if (!candidate || (!candidate.candidate && candidate.sdpMid === null)) return;
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) { }
};

window.hangUp = () => {
    for (let id in peerConnections) { peerConnections[id].close(); delete peerConnections[id]; }
    for (let i = 1; i <= 3; i++) {
        let v = document.getElementById(`remoteVideo${i}`);
        if (v) { v.srcObject = null; v.removeAttribute("data-id"); }
    }
};

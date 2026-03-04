let localStream;
let peerConnection;
let dotNetHelper;
let iceCandidatesQueue = [];
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

window.prepareWebRTC = (helper) => {
    dotNetHelper = helper;
    console.log("!!! WebRTC ÌÎÑÒ ÓÑÒÀÍÎÂËÅÍ !!!");
};

window.startLocalVideo = async (id) => {
    console.log("Âêëþ÷àþ êàìåðó...");
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById(id).srcObject = localStream;
};

function createPC() {
    console.log("Ñîçäàþ PeerConnection...");
    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));

    peerConnection.onicecandidate = (e) => {
        if (e.candidate && dotNetHelper) {
            console.log("Îòïðàâëÿþ ICE-êàíäèäàòà äðóãó...");
            dotNetHelper.invokeMethodAsync('SendIceCandidate', JSON.stringify(e.candidate));
        }
    };

    peerConnection.ontrack = (e) => {
        console.log("ÏÎËÓ×ÅÍ ÂÈÄÅÎ-ÏÎÒÎÊ ÎÒ ÄÐÓÃÀ!");
        document.getElementById('remoteVideo').srcObject = e.streams[0];
    };
}

window.createOffer = async () => {
    if (!peerConnection) createPC();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log("OFFER ÑÎÇÄÀÍ È ÎÒÏÐÀÂËÅÍ");
    return JSON.stringify(offer);
};

window.processOffer = async (offerJson) => {
    console.log("ÏÎËÓ×ÅÍ OFFER ÎÒ ÄÐÓÃÀ, ÃÎÒÎÂËÞ ÎÒÂÅÒ...");
    if (!peerConnection) createPC();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // ×èñòèì î÷åðåäü
    if (iceCandidatesQueue.length > 0) {
        iceCandidatesQueue.forEach(c => peerConnection.addIceCandidate(c));
        iceCandidatesQueue = [];
    }
    return JSON.stringify(answer);
};

window.processAnswer = async (ansJson) => {
    console.log("ÏÎËÓ×ÅÍ ÎÒÂÅÒ (ANSWER), ÑÎÅÄÈÍßÞÑÜ...");
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(ansJson)));
};

window.addIceCandidate = async (candJson) => {
    const candidate = new RTCIceCandidate(JSON.parse(candJson));
    if (!peerConnection || !peerConnection.remoteDescription) {
        iceCandidatesQueue.push(candidate);
    } else {
        await peerConnection.addIceCandidate(candidate);
    }
};

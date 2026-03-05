let localStream;
let peerConnection;
let dotNetHelper;
let iceCandidatesQueue = [];

// КОНФИГ ИЗ ЛИЧНОГО КАБИНЕТА METERED (ПОЛНЫЙ СПИСОК)
const config = {
    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "2e7e778f6d1b07b279414c2d",
            credential: "MOO2Lssrfa/+i8LI",
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "2e7e778f6d1b07b279414c2d",
            credential: "MOO2Lssrfa/+i8LI",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "2e7e778f6d1b07b279414c2d",
            credential: "MOO2Lssrfa/+i8LI",
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "2e7e778f6d1b07b279414c2d",
            credential: "MOO2Lssrfa/+i8LI",
        }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle'
};

window.prepareWebRTC = (helper) => {
    dotNetHelper = helper;
    console.log("!!! WebRTC мост установлен !!!");
};

window.startLocalVideo = async (id) => {
    console.log("Включаю камеру...");
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const videoElem = document.getElementById(id);
        if (videoElem) videoElem.srcObject = localStream;
    } catch (err) {
        console.error("Ошибка камеры:", err);
    }
};

function createPC() {
    console.log("Создаю PeerConnection (GLOBAL RELAY)...");
    peerConnection = new RTCPeerConnection(config);

    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    peerConnection.onicecandidate = (e) => {
        if (e.candidate && dotNetHelper) {
            dotNetHelper.invokeMethodAsync('SendIceCandidate', JSON.stringify(e.candidate));
        }
    };

    peerConnection.ontrack = (e) => {
        console.log("ВИДЕОПОТОК ПОЛУЧЕН!");
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.srcObject = e.streams[0];
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log("Статус ICE:", peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'disconnected') {
            console.warn("Потеря связи, ожидание восстановления...");
        }
    };
}

window.createOffer = async () => {
    if (!peerConnection) createPC();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return JSON.stringify(offer);
};

window.processOffer = async (offerJson) => {
    if (!peerConnection) createPC();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // Сразу обрабатываем накопившихся кандидатов
    while (iceCandidatesQueue.length > 0) {
        const cand = iceCandidatesQueue.shift();
        await peerConnection.addIceCandidate(cand).catch(e => { });
    }
    return JSON.stringify(answer);
};

window.processAnswer = async (ansJson) => {
    if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(ansJson)));
        while (iceCandidatesQueue.length > 0) {
            const cand = iceCandidatesQueue.shift();
            await peerConnection.addIceCandidate(cand).catch(e => { });
        }
    }
};

window.addIceCandidate = async (candJson) => {
    const candidate = new RTCIceCandidate(JSON.parse(candJson));
    if (!peerConnection || !peerConnection.remoteDescription || !peerConnection.remoteDescription.type) {
        iceCandidatesQueue.push(candidate);
    } else {
        await peerConnection.addIceCandidate(candidate).catch(e => { });
    }
};
